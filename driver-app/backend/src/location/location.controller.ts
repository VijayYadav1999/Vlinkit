import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { LocationService } from './location.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('location')
export class LocationController {
  constructor(private locationService: LocationService) {}

  @Post()
  async updateLocation(
    @Request() req,
    @Body() dto: { latitude: number; longitude: number },
  ) {
    await this.locationService.updateDriverLocation(req.user.id, dto.latitude, dto.longitude);
    return { updated: true };
  }
}
