import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Product extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  mrp: number;

  @Prop({ required: true, index: true })
  category: string;

  @Prop()
  sub_category: string;

  @Prop()
  image_url: string;

  @Prop([String])
  images: string[];

  @Prop({ required: true, default: true })
  in_stock: boolean;

  @Prop({ default: 100 })
  quantity_available: number;

  @Prop()
  unit: string;

  @Prop()
  weight: string;

  @Prop()
  brand: string;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 10 })
  delivery_time_minutes: number;

  @Prop()
  warehouse_id: string;

  @Prop([String])
  tags: string[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
