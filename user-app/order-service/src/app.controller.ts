import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      service: 'Vlinkit Order Service',
      status: 'running',
      version: '1.0.0',
      endpoints: ['/api/products', '/api/cart', '/api/orders', '/api/payments'],
    };
  }
}
