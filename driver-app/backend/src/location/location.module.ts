import { Module, Global } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';

@Global()
@Module({
  providers: [LocationService],
  controllers: [LocationController],
  exports: [LocationService],
})
export class LocationModule {}
