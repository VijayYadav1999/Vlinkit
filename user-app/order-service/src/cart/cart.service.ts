import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CartService {
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get('REDIS_PASSWORD', '') || undefined,
      tls: configService.get('REDIS_HOST', 'localhost').includes('upstash') ? {} : undefined,
    });
  }

  private cartKey(userId: string) {
    return `cart:${userId}`;
  }

  async getCart(userId: string) {
    const cart = await this.redis.hgetall(this.cartKey(userId));
    const items = Object.entries(cart).map(([productId, data]) => ({
      productId,
      ...JSON.parse(data),
    }));
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return {
      items,
      subtotal,
      tax: Math.round(subtotal * 0.05 * 100) / 100,
      delivery_fee: items.length > 0 ? 50 : 0,
      total: Math.round((subtotal * 1.05 + (items.length > 0 ? 50 : 0)) * 100) / 100,
      item_count: items.length,
    };
  }

  async addItem(userId: string, item: {
    productId: string; name: string; price: number;
    quantity: number; image_url?: string;
  }) {
    const existing = await this.redis.hget(this.cartKey(userId), item.productId);
    let quantity = item.quantity;
    if (existing) {
      const parsed = JSON.parse(existing);
      quantity = parsed.quantity + item.quantity;
    }
    await this.redis.hset(
      this.cartKey(userId),
      item.productId,
      JSON.stringify({ name: item.name, price: item.price, quantity, image_url: item.image_url || '' }),
    );
    return this.getCart(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    if (quantity <= 0) return this.removeItem(userId, productId);
    const existing = await this.redis.hget(this.cartKey(userId), productId);
    if (!existing) return this.getCart(userId);
    const parsed = JSON.parse(existing);
    parsed.quantity = quantity;
    await this.redis.hset(this.cartKey(userId), productId, JSON.stringify(parsed));
    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    await this.redis.hdel(this.cartKey(userId), productId);
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    await this.redis.del(this.cartKey(userId));
    return { items: [], subtotal: 0, tax: 0, delivery_fee: 0, total: 0, item_count: 0 };
  }
}
