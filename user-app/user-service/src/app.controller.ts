import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      service: 'Vlinkit User Service',
      status: 'running',
      version: '1.0.0',
      endpoints: ['/api/auth', '/api/users'],
    };
  }
}
