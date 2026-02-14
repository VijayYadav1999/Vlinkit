import { Module, Global } from '@nestjs/common';
import { FleetEngineService } from './fleet-engine.service';

@Global()
@Module({
  providers: [FleetEngineService],
  exports: [FleetEngineService],
})
export class FleetEngineModule {}
