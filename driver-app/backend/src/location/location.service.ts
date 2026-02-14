import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const DRIVER_GEO_KEY = 'driver:location';
const DRIVER_AVAILABILITY_PREFIX = 'driver:available:';

@Injectable()
export class LocationService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', '') || undefined,
      tls: this.configService.get('REDIS_HOST', 'localhost').includes('upstash') ? {} : undefined,
    });
  }

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  /**
   * Update driver's GPS location in Redis GEO set
   */
  async updateDriverLocation(driverId: string, latitude: number, longitude: number): Promise<void> {
    await this.redis.geoadd(DRIVER_GEO_KEY, longitude, latitude, driverId);
    await this.redis.set(`${DRIVER_AVAILABILITY_PREFIX}${driverId}`, 'true', 'EX', 300); // 5 min TTL
  }

  /**
   * Remove driver from the GEO set (when going offline)
   */
  async removeDriverLocation(driverId: string): Promise<void> {
    await this.redis.zrem(DRIVER_GEO_KEY, driverId);
    await this.redis.del(`${DRIVER_AVAILABILITY_PREFIX}${driverId}`);
  }

  /**
   * Find all available drivers within a given radius (in km) of a location
   * This is the core method for the "notify drivers within 5km" feature
   */
  async findDriversNearby(latitude: number, longitude: number, radiusKm: number = 5): Promise<string[]> {
    // GEORADIUS returns drivers within the radius
    const results = await this.redis.georadius(
      DRIVER_GEO_KEY,
      longitude,
      latitude,
      radiusKm,
      'km',
      'ASC', // closest first
      'COUNT', 50,
    );

    // Filter only available drivers
    const availableDrivers: string[] = [];
    for (const driverId of results) {
      const available = await this.redis.get(`${DRIVER_AVAILABILITY_PREFIX}${driverId}`);
      if (available === 'true') {
        availableDrivers.push(driverId as string);
      }
    }

    return availableDrivers;
  }

  /**
   * Get a specific driver's current location
   */
  async getDriverLocation(driverId: string): Promise<{ latitude: number; longitude: number } | null> {
    const positions = await this.redis.geopos(DRIVER_GEO_KEY, driverId);
    if (!positions || !positions[0]) return null;
    return {
      longitude: parseFloat(positions[0][0] as string),
      latitude: parseFloat(positions[0][1] as string),
    };
  }

  /**
   * Get distance between driver and a point
   */
  async getDistanceToPoint(
    driverId: string,
    latitude: number,
    longitude: number,
  ): Promise<number | null> {
    // Add a temporary point
    const tempKey = `temp:point:${Date.now()}`;
    await this.redis.geoadd(tempKey, longitude, latitude, 'target');
    // Unfortunately Redis GEODIST only works between members of the same key
    // So we use a different approach
    const driverPos = await this.getDriverLocation(driverId);
    await this.redis.del(tempKey);

    if (!driverPos) return null;

    return this.calculateDistance(
      driverPos.latitude, driverPos.longitude,
      latitude, longitude,
    );
  }

  /**
   * Haversine formula - calculate distance between two GPS coordinates
   */
  private calculateDistance(
    lat1: number, lon1: number, lat2: number, lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Cache order status
   */
  async setOrderStatus(orderId: string, status: string): Promise<void> {
    await this.redis.set(`order:${orderId}:status`, status, 'EX', 86400);
  }

  async getOrderStatus(orderId: string): Promise<string | null> {
    return this.redis.get(`order:${orderId}:status`);
  }
}
