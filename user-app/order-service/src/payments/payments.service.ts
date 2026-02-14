import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      configService.get('STRIPE_SECRET_KEY', 'sk_test_placeholder'),
      { apiVersion: '2023-10-16' as any },
    );
  }

  async createPaymentIntent(amount: number, currency: string = 'inr', metadata: any = {}) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit (paise)
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    return {
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  async confirmPayment(paymentIntentId: string) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const endpointSecret = this.configService.get('STRIPE_WEBHOOK_SECRET', '');
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);

      switch (event.type) {
        case 'payment_intent.succeeded':
          return { type: 'success', data: event.data.object };
        case 'payment_intent.payment_failed':
          return { type: 'failed', data: event.data.object };
        default:
          return { type: 'unhandled', eventType: event.type };
      }
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }
  }
}
