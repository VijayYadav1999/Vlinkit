import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@Request() req) {
    return this.cartService.getCart(req.user.sub);
  }

  @Post('items')
  addItem(@Request() req, @Body() body: {
    productId: string; name: string; price: number;
    quantity: number; image_url?: string;
  }) {
    return this.cartService.addItem(req.user.sub, body);
  }

  @Put('items/:productId')
  updateItem(@Request() req, @Param('productId') productId: string, @Body() body: { quantity: number }) {
    return this.cartService.updateItem(req.user.sub, productId, body.quantity);
  }

  @Delete('items/:productId')
  removeItem(@Request() req, @Param('productId') productId: string) {
    return this.cartService.removeItem(req.user.sub, productId);
  }

  @Delete()
  clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.sub);
  }
}
