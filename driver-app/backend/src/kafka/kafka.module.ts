import { Module, forwardRef } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
