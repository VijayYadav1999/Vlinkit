import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './order.schema';
import { CartService } from '../cart/cart.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private cartService: CartService,
    private kafkaProducer: KafkaProducerService,
  ) {}

  async createOrder(userId: string, dto: {
    delivery_address: {
      address_line_1: string; city: string; state: string;
      postal_code: string; latitude: number; longitude: number;
    };
    special_instructions?: string;
  }) {
    console.log('📦 [OrderService] Creating order for user:', userId);
    const cart = await this.cartService.getCart(userId);
    if (cart.items.length === 0) {
      throw new NotFoundException('Cart is empty');
    }

    console.log('📦 [OrderService] Cart contains', cart.items.length, 'items');

    const orderNumber = `VLK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${uuidv4().slice(0, 4).toUpperCase()}`;

    // Default warehouse (Bangalore center)
    const warehouseLocation = {
      latitude: 12.9716,
      longitude: 77.5946,
      address: 'Vlinkit Warehouse, Koramangala, Bangalore',
    };

    const order = new this.orderModel({
      order_number: orderNumber,
      user_id: userId,
      items: cart.items.map(item => ({
        product_id: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image_url: item.image_url || '',
      })),
      delivery_address: dto.delivery_address,
      warehouse_location: warehouseLocation,
      status: 'placed',
      subtotal: cart.subtotal,
      tax: cart.tax,
      delivery_fee: cart.delivery_fee,
      total_amount: cart.total,
      special_instructions: dto.special_instructions,
      estimated_delivery_time: new Date(Date.now() + 30 * 60 * 1000), // 30 min
    });

    await order.save();
    console.log('✅ [OrderService] Order saved to MongoDB:', order._id);

    // Clear cart after order creation
    await this.cartService.clearCart(userId);

    // IMMEDIATELY emit Kafka event to notify drivers about the new order
    console.log('📤 [OrderService] Emitting Kafka event for order:', order._id);
    try {
      await this.kafkaProducer.emit('order.created', {
        orderId: order._id.toString(),
        orderNumber: order.order_number,
        userId: order.user_id,
        items: order.items,
        deliveryAddress: {
          address: `${order.delivery_address.address_line_1}, ${order.delivery_address.city}`,
          latitude: order.delivery_address.latitude,
          longitude: order.delivery_address.longitude,
        },
        pickupAddress: {
          address: order.warehouse_location.address,
          latitude: order.warehouse_location.latitude,
          longitude: order.warehouse_location.longitude,
        },
        totalAmount: order.total_amount,
        deliveryFee: order.delivery_fee || 0,
        timestamp: new Date().toISOString(),
      });
      console.log('✅ [OrderService] Kafka event emitted successfully');
    } catch (error) {
      console.error('❌ [OrderService] Error emitting Kafka event:', error);
    }

    return order;
  }

  async confirmPayment(orderId: string, paymentId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    order.status = 'payment_completed';
    order.payment_id = paymentId;
    await order.save();

    // Emit Kafka event to notify drivers
    await this.kafkaProducer.emit('order.created', {
      orderId: order._id.toString(),
      orderNumber: order.order_number,
      userId: order.user_id,
      items: order.items,
      deliveryAddress: {
        address: `${order.delivery_address.address_line_1}, ${order.delivery_address.city}`,
        latitude: order.delivery_address.latitude,
        longitude: order.delivery_address.longitude,
      },
      pickupAddress: {
        address: order.warehouse_location.address,
        latitude: order.warehouse_location.latitude,
        longitude: order.warehouse_location.longitude,
      },
      totalAmount: order.total_amount,
      deliveryFee: order.delivery_fee || 0,
      timestamp: new Date().toISOString(),
    });

    return order;
  }

  async getOrdersByUser(userId: string) {
    return this.orderModel
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .exec();
  }

  async getOrderById(orderId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(orderId: string, status: string, driverId?: string) {
    const update: any = { status };
    if (driverId) update.driver_id = driverId;
    if (status === 'delivered') update.actual_delivery_time = new Date();

    const order = await this.orderModel.findByIdAndUpdate(orderId, update, { new: true });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
