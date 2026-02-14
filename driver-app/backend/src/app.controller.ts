import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      service: 'Vlinkit Driver Service',
      status: 'running',
      version: '1.0.0',
      endpoints: ['/api/driver/auth', '/api/driver/drivers', '/api/driver/orders', '/api/driver/location'],
    };
  }
}
