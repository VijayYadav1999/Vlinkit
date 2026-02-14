import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

/**
 * Google Fleet Engine integration for real-time vehicle tracking.
 * Fleet Engine provides:
 * - Vehicle management (create, update position)
 * - Delivery task tracking (create, update status)
 * - Task tracking info for customers
 *
 * Requires a GCP project with Fleet Engine API enabled and a service account.
 */
@Injectable()
export class FleetEngineService implements OnModuleInit {
  private readonly logger = new Logger(FleetEngineService.name);
  private auth: GoogleAuth;
  private projectId: string;
  private enabled = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const keyFilePath = this.configService.get('GOOGLE_APPLICATION_CREDENTIALS');
    this.projectId = this.configService.get('GOOGLE_CLOUD_PROJECT_ID', '');

    if (!keyFilePath || !this.projectId) {
      this.logger.warn(
        'Fleet Engine disabled: GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_PROJECT_ID not set',
      );
      return;
    }

    try {
      this.auth = new GoogleAuth({
        keyFilename: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      this.enabled = true;
      this.logger.log('Fleet Engine integration initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Fleet Engine auth', error);
    }
  }

  private get baseUrl(): string {
    return `https://fleetengine.googleapis.com/v1/providers/${this.projectId}`;
  }

  private async getHeaders() {
    const client = await this.auth.getClient();
    const token = await client.getAccessToken();
    return {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a vehicle in Fleet Engine when a driver registers
   */
  async createVehicle(driverId: string, vehicleType: string = 'AUTO'): Promise<string | null> {
    if (!this.enabled) {
      this.logger.debug('Fleet Engine disabled, skipping createVehicle');
      return `mock-vehicle-${driverId}`;
    }

    try {
      const vehicleId = `driver-${driverId}`;
      const response = await fetch(`${this.baseUrl}/vehicles?vehicleId=${vehicleId}`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({
          vehicleState: 'OFFLINE',
          vehicleType: { category: vehicleType },
          attributes: [
            { key: 'driver_id', value: driverId },
          ],
          maximumCapacity: 1,
          supportedTripTypes: ['EXCLUSIVE'],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Failed to create vehicle: ${error}`);
        return null;
      }

      const data = await response.json();
      this.logger.log(`Vehicle created: ${vehicleId}`);
      return data.name || vehicleId;
    } catch (error) {
      this.logger.error('Fleet Engine createVehicle error', error);
      return null;
    }
  }

  /**
   * Update vehicle location and state
   * Called when driver updates their GPS position
   */
  async updateVehicleLocation(
    vehicleId: string,
    latitude: number,
    longitude: number,
    isOnline: boolean,
  ): Promise<boolean> {
    if (!this.enabled) return true;

    try {
      const response = await fetch(
        `${this.baseUrl}/vehicles/${vehicleId}?updateMask=lastLocation,vehicleState`,
        {
          method: 'PUT',
          headers: await this.getHeaders(),
          body: JSON.stringify({
            lastLocation: {
              supplementalLocation: {
                latitude,
                longitude,
              },
              supplementalLocationTime: new Date().toISOString(),
              supplementalLocationAccuracy: 10,
            },
            vehicleState: isOnline ? 'ONLINE' : 'OFFLINE',
          }),
        },
      );

      return response.ok;
    } catch (error) {
      this.logger.error('Fleet Engine updateVehicleLocation error', error);
      return false;
    }
  }

  /**
   * Create a delivery task when an order is assigned to a driver
   */
  async createDeliveryTask(
    orderId: string,
    driverId: string,
    pickupLocation: { latitude: number; longitude: number },
    deliveryLocation: { latitude: number; longitude: number },
  ): Promise<string | null> {
    if (!this.enabled) {
      return `mock-task-${orderId}`;
    }

    try {
      const taskId = `order-${orderId}`;
      const response = await fetch(`${this.baseUrl}/deliveryTasks?taskId=${taskId}`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({
          type: 'DELIVERY',
          state: 'OPEN',
          trackingId: orderId,
          plannedLocation: {
            point: {
              latitude: deliveryLocation.latitude,
              longitude: deliveryLocation.longitude,
            },
          },
          taskDuration: '600s', // 10 min estimated
          attributes: [
            { key: 'order_id', value: orderId },
            { key: 'driver_id', value: driverId },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Failed to create delivery task: ${error}`);
        return null;
      }

      const data = await response.json();
      return data.name || taskId;
    } catch (error) {
      this.logger.error('Fleet Engine createDeliveryTask error', error);
      return null;
    }
  }

  /**
   * Update delivery task status
   */
  async updateTaskStatus(
    taskId: string,
    state: 'OPEN' | 'CLOSED',
    outcome?: 'SUCCEEDED' | 'FAILED',
  ): Promise<boolean> {
    if (!this.enabled) return true;

    try {
      const body: any = { state };
      if (outcome) {
        body.taskOutcome = outcome;
        body.taskOutcomeTime = new Date().toISOString();
      }

      const updateMask = outcome ? 'state,taskOutcome,taskOutcomeTime' : 'state';
      const response = await fetch(
        `${this.baseUrl}/deliveryTasks/${taskId}?updateMask=${updateMask}`,
        {
          method: 'PATCH',
          headers: await this.getHeaders(),
          body: JSON.stringify(body),
        },
      );

      return response.ok;
    } catch (error) {
      this.logger.error('Fleet Engine updateTaskStatus error', error);
      return false;
    }
  }

  /**
   * Get task tracking info (for customer-facing real-time tracking)
   */
  async getTaskTrackingInfo(trackingId: string): Promise<any | null> {
    if (!this.enabled) {
      return {
        name: `mock-tracking-${trackingId}`,
        state: 'OPEN',
        routePolylinePoints: [],
        estimatedArrivalTime: new Date(Date.now() + 600000).toISOString(),
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/taskTrackingInfo/${trackingId}`,
        {
          method: 'GET',
          headers: await this.getHeaders(),
        },
      );

      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      this.logger.error('Fleet Engine getTaskTrackingInfo error', error);
      return null;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
