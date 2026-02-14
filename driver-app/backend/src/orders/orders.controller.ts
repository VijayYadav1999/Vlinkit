import {
  Controller, Get, Post, Put, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { DriverOrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class DriverOrdersController {
  constructor(private ordersService: DriverOrdersService) {}

  /** Get all pending order offers for this driver */
  @Get('offers')
  getPendingOffers(@Request() req) {
    return this.ordersService.getPendingOffers(req.user.id);
  }

  /** Accept an order offer */
  @Post('offers/:orderId/accept')
  acceptOrder(@Request() req, @Param('orderId') orderId: string) {
    return this.ordersService.acceptOrder(req.user.id, orderId);
  }

  /** Reject an order offer */
  @Post('offers/:orderId/reject')
  rejectOrder(@Request() req, @Param('orderId') orderId: string) {
    return this.ordersService.rejectOrder(req.user.id, orderId);
  }

  /** Get current active delivery */
  @Get('active')
  getActiveDelivery(@Request() req) {
    const delivery = this.ordersService.getActiveDelivery(req.user.id);
    return delivery || { active: false };
  }

  /** Update delivery status */
  @Put('active/status')
  updateDeliveryStatus(
    @Request() req,
    @Body() dto: { status: 'picked_up' | 'on_the_way' | 'arrived' | 'delivered' },
  ) {
    return this.ordersService.updateDeliveryStatus(req.user.id, dto.status);
  }
}
