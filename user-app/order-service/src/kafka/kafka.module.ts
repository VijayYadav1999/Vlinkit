import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaProducerService } from './kafka-producer.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { KafkaHandlersService } from './kafka-handlers.service';
import { Order, OrderSchema } from '../orders/order.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  providers: [KafkaProducerService, KafkaConsumerService, KafkaHandlersService],
  exports: [KafkaProducerService, KafkaConsumerService],
})
export class KafkaModule {}
