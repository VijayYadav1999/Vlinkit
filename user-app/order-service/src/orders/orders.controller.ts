import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async createOrder(@Request() req, @Body() body: {
    delivery_address: {
      address_line_1: string; city: string; state: string;
      postal_code: string; latitude: number; longitude: number;
    };
    items?: { productId: string; name: string; price: number; quantity: number; image_url?: string }[];
    special_instructions?: string;
  }) {
    // For testing: use a mock user ID if not provided
    const userId = req.user?.sub || 'test-user-' + Date.now();
    return this.ordersService.createOrder(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyOrders(@Request() req) {
    return this.ordersService.getOrdersByUser(req.user.sub);
  }

  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }
}
