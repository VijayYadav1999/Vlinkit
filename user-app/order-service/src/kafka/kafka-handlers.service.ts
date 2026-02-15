import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { KafkaConsumerService } from './kafka-consumer.service';
import { Order } from '../orders/order.schema';

@Injectable()
export class KafkaHandlersService implements OnModuleInit {
  private readonly logger = new Logger(KafkaHandlersService.name);

  constructor(
    private kafkaConsumer: KafkaConsumerService,
    @InjectModel('Order') private orderModel: Model<Order>,
  ) {}

  onModuleInit() {
    // Register handler for when a driver is assigned to an order
    this.kafkaConsumer.registerHandler('order.assigned', async (data) => {
      this.logger.log(`🚗 Driver ${data.driverId} assigned to order ${data.orderId}`);
      try {
        await this.orderModel.findByIdAndUpdate(data.orderId, {
          status: 'assigned',
          driver_id: data.driverId,
          assigned_at: data.assignedAt || new Date(),
        });
        this.logger.log(`✅ Order ${data.orderId} updated to 'assigned' in MongoDB`);
      } catch (error) {
        this.logger.error(`❌ Failed to update order ${data.orderId}:`, error);
      }
    });

    // Register handler for delivery status updates
    this.kafkaConsumer.registerHandler('order.status', async (data) => {
      this.logger.log(`📦 Order ${data.orderId} status: ${data.status}`);
      try {
        const update: any = { status: data.status };
        if (data.status === 'delivered') {
          update.actual_delivery_time = new Date();
        }
        await this.orderModel.findByIdAndUpdate(data.orderId, update);
        this.logger.log(`✅ Order ${data.orderId} updated to '${data.status}' in MongoDB`);
      } catch (error) {
        this.logger.error(`❌ Failed to update order ${data.orderId}:`, error);
      }
    });

    this.logger.log('✅ Kafka handlers registered for order.assigned and order.status');
  }
}
