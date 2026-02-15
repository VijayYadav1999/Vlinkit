import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      service: 'Vlinkit Driver Service',
      status: 'running',
      version: '1.0.0',
      endpoints: ['/api/auth', '/api/profile', '/api/orders', '/api/location'],
    };
  }
}
