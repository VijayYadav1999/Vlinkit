import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './product.schema';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<Product>) {}

  async findAll(query: {
    category?: string;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
    min_price?: number;
    max_price?: number;
  }) {
    const { category, search, sort, page = 1, limit = 20, min_price, max_price } = query;
    const filter: any = { in_stock: true };

    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };
    if (min_price || max_price) {
      filter.price = {};
      if (min_price) filter.price.$gte = Number(min_price);
      if (max_price) filter.price.$lte = Number(max_price);
    }

    let sortObj: any = { created_at: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'rating') sortObj = { rating: -1 };
    else if (sort === 'name') sortObj = { name: 1 };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      this.productModel.find(filter).sort(sortObj).skip(skip).limit(Number(limit)).exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findById(id: string) {
    return this.productModel.findById(id).exec();
  }

  async getCategories() {
    return this.productModel.distinct('category').exec();
  }
}
