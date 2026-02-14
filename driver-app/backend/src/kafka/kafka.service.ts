import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { LocationService } from '../location/location.service';
import { DriverOrdersService } from '../orders/orders.service';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor(
    private configService: ConfigService,
    private locationService: LocationService,
    private ordersService: DriverOrdersService,
  ) {}

  async onModuleInit() {
    const brokers = this.configService.get('KAFKA_BROKERS', 'localhost:9092').split(',');

    this.kafka = new Kafka({
      clientId: 'driver-service',
      brokers,
      retry: { retries: 5 },
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'driver-service-group' });

    try {
      await this.producer.connect();
      await this.consumer.connect();

      // Subscribe to relevant topics
      await this.consumer.subscribe({ topic: 'order.created', fromBeginning: false });
      await this.consumer.subscribe({ topic: 'payment.completed', fromBeginning: false });

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      this.logger.log('Kafka connected - subscribed to order.created, payment.completed');
    } catch (error) {
      this.logger.error('Kafka connection failed', error);
    }
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
    await this.consumer?.disconnect();
  }

  private async handleMessage({ topic, message }: EachMessagePayload) {
    try {
      this.logger.log(`📨 [KafkaConsumer] Received message from topic "${topic}"`);
      const data = JSON.parse(message.value?.toString() || '{}');
      this.logger.log(`📨 [KafkaConsumer] Message data:`, JSON.stringify(data, null, 2));

      switch (topic) {
        case 'order.created':
          await this.handleOrderCreated(data);
          break;
        case 'payment.completed':
          await this.handlePaymentCompleted(data);
          break;
      }
    } catch (error) {
      this.logger.error(`❌ [KafkaConsumer] Error processing message from ${topic}`, error);
    }
  }

  private async handleOrderCreated(data: {
    orderId: string;
    userId: string;
    items: any[];
    totalAmount: number;
    deliveryAddress: { address: string; latitude: number; longitude: number };
    pickupAddress: { address: string; latitude: number; longitude: number };
    deliveryFee: number;
  }) {
    this.logger.log(`📦 [OrderHandler] New order received: ${data.orderId}`);
    this.logger.debug(`Pickup coordinates: (${data.pickupAddress.latitude}, ${data.pickupAddress.longitude})`);

    // Find drivers within 5km of the pickup (store/warehouse)
    this.logger.log(`🔍 [OrderHandler] Searching for nearby drivers...`);
    const nearbyDrivers = await this.locationService.findDriversNearby(
      data.pickupAddress.latitude,
      data.pickupAddress.longitude,
      5, // 5km radius
    );

    if (nearbyDrivers.length === 0) {
      this.logger.warn(`⚠️ [OrderHandler] No available drivers found near pickup for order ${data.orderId}`);
      // Publish event that no drivers available
      await this.emit('driver.unavailable', { orderId: data.orderId });
      return;
    }

    this.logger.log(`✅ [OrderHandler] Found ${nearbyDrivers.length} nearby drivers for order ${data.orderId}`);

    // Create order offer for each nearby driver
    for (const driverId of nearbyDrivers) {
      const driverLocation = await this.locationService.getDriverLocation(driverId);
      const estimatedDistance = driverLocation
        ? this.calculateDistance(
            driverLocation.latitude, driverLocation.longitude,
            data.pickupAddress.latitude, data.pickupAddress.longitude,
          )
        : 0;

      this.logger.log(`📤 [OrderHandler] Creating offer for driver ${driverId}, distance: ${estimatedDistance}km`);
      this.ordersService.addOrderOffer(driverId, {
        orderId: data.orderId,
        userId: data.userId,
        items: data.items,
        totalAmount: data.totalAmount,
        deliveryAddress: data.deliveryAddress,
        pickupAddress: data.pickupAddress,
        estimatedDistance,
        deliveryFee: data.deliveryFee,
        expiresAt: new Date(Date.now() + 60000), // 60 sec to accept
      });

      // Notify driver via WebSocket bridge
      await this.emit('driver.notification', {
        driverId,
        type: 'new_order_offer',
        orderId: data.orderId,
        estimatedDistance,
        deliveryFee: data.deliveryFee,
      });
    }
  }

  /**
   * Handle payment completed event (confirm order to driver)
   */
  private async handlePaymentCompleted(data: {
    orderId: string;
    paymentId: string;
    amount: number;
  }) {
    this.logger.log(`Payment completed for order ${data.orderId}`);
    // This is handled by the order-service mainly; 
    // driver service gets this as confirmation
  }

  /**
   * Emit an event to a Kafka topic
   */
  async emit(topic: string, data: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(data) }],
      });
    } catch (error) {
      this.logger.error(`Failed to emit to ${topic}`, error);
    }
  }

  /**
   * Emit order.assigned event when driver accepts an order
   */
  async emitOrderAssigned(orderId: string, driverId: string): Promise<void> {
    await this.emit('order.assigned', {
      orderId,
      driverId,
      assignedAt: new Date().toISOString(),
    });
  }

  /**
   * Emit order.status event when delivery status changes
   */
  async emitOrderStatusUpdate(
    orderId: string,
    driverId: string,
    status: string,
  ): Promise<void> {
    await this.emit('order.status', {
      orderId,
      driverId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit driver.location event for real-time tracking
   */
  async emitDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await this.emit('driver.location', {
      driverId,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    });
  }

  private calculateDistance(
    lat1: number, lon1: number, lat2: number, lon2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
