import { Module } from '@nestjs/common';
import { DriverOrdersService } from './orders.service';
import { DriverOrdersController } from './orders.controller';

@Module({
  providers: [DriverOrdersService],
  controllers: [DriverOrdersController],
  exports: [DriverOrdersService],
})
export class OrdersModule {}
