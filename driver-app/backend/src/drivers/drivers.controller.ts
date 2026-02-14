import { Controller, Get, Put, Body, Query, UseGuards, Request } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class DriversController {
  constructor(private driversService: DriversService) {}

  @Get()
  getProfile(@Request() req) {
    return this.driversService.getProfile(req.user.id);
  }

  @Put()
  updateProfile(@Request() req, @Body() dto: any) {
    return this.driversService.updateProfile(req.user.id, dto);
  }

  @Put('availability')
  toggleAvailability(
    @Request() req,
    @Body() dto: { is_available: boolean; latitude?: number; longitude?: number },
  ) {
    return this.driversService.toggleAvailability(req.user.id, dto.is_available, dto.latitude, dto.longitude);
  }

  @Get('earnings')
  getEarnings(@Request() req, @Query('period') period?: string) {
    return this.driversService.getEarnings(req.user.id, period);
  }
}
