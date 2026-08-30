import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Get()
  check(): Promise<{ status: 'ok'; database: 'up' }> { return this.health.check(); }
}
