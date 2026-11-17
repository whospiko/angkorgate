import { Controller, Get } from '@nestjs/common';
import { SkipTransform } from './common/decorators/skip-transform.decorator';

@Controller()
export class AppController {
  @Get()
  @SkipTransform()
  health() {
    return { status: 'ok' };
  }
}
