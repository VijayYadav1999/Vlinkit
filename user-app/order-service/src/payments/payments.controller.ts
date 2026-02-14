import { Controller, Post, Body, UseGuards, Request, Headers, RawBody } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private ordersService: OrdersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-intent')
  async createPaymentIntent(@Body() body: { order_id: string; amount: number }) {
    return this.paymentsService.createPaymentIntent(body.amount, 'inr', {
      order_id: body.order_id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('confirm')
  async confirmPayment(@Body() body: { order_id: string; payment_intent_id: string }) {
    const payment = await this.paymentsService.confirmPayment(body.payment_intent_id);
    if (payment.status === 'succeeded') {
      await this.ordersService.confirmPayment(body.order_id, payment.id);
    }
    return payment;
  }

  @Post('webhook')
  async handleWebhook(@Headers('stripe-signature') signature: string, @Body() body: any) {
    // In production, use raw body for webhook verification
    return this.paymentsService.handleWebhook(signature, body);
  }
}
