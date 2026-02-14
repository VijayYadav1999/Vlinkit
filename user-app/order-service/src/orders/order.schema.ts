import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class OrderItem {
  @Prop({ required: true })
  product_id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop()
  image_url: string;
}

@Schema()
export class DeliveryAddress {
  @Prop()
  address_line_1: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  postal_code: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;
}

@Schema()
export class WarehouseLocation {
  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop()
  address: string;
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Order extends Document {
  @Prop({ required: true, unique: true })
  order_number: string;

  @Prop({ required: true, index: true })
  user_id: string;

  @Prop({ index: true })
  driver_id: string;

  @Prop({ type: [OrderItem], required: true })
  items: OrderItem[];

  @Prop({ type: DeliveryAddress, required: true })
  delivery_address: DeliveryAddress;

  @Prop({ type: WarehouseLocation })
  warehouse_location: WarehouseLocation;

  @Prop({
    required: true,
    enum: ['placed', 'confirmed', 'payment_completed', 'driver_assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
    default: 'placed',
    index: true,
  })
  status: string;

  @Prop()
  payment_id: string;

  @Prop({ required: true })
  subtotal: number;

  @Prop({ required: true })
  tax: number;

  @Prop({ default: 50 })
  delivery_fee: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ required: true })
  total_amount: number;

  @Prop()
  special_instructions: string;

  @Prop()
  estimated_delivery_time: Date;

  @Prop()
  actual_delivery_time: Date;

  @Prop()
  fleet_engine_task_id: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
