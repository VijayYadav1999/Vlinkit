import { Module, forwardRef } from '@nestjs/common';
import { DriverOrdersService } from './orders.service';
import { DriverOrdersController } from './orders.controller';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [forwardRef(() => KafkaModule)],
  providers: [DriverOrdersService],
  controllers: [DriverOrdersController],
  exports: [DriverOrdersService],
})
export class OrdersModule {}
