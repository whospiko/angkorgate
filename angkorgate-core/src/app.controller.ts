import { Controller, Get, Optional, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';
import { SkipTransform } from './common/decorators/skip-transform.decorator';
import { CacheService } from './cache/cache.service';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(
    @Optional()
    private readonly cacheService?: CacheService,
  ) { }

  @Get()
  @SkipTransform()
  @ApiOperation({ summary: 'System health check probe' })
  @ApiResponse({ status: 200, description: 'Service is healthy and responding' })
  health() {
    return {
      status: 'ok',
      cache: this.cacheService?.getStatus() ?? {
        provider: 'memory',
        connected: false,
        enabled: false,
        prefix: 'angkorgate:',
      },
    };
  }

  @Get('cache/status')
  @ApiTags('Cache')
  @ApiOperation({ summary: 'Get Redis & In-Memory cache operational status' })
  @ApiResponse({ status: 200, description: 'Cache status metrics' })
  cacheStatus() {
    return this.cacheService?.getStatus() ?? {
      provider: 'memory',
      connected: false,
      enabled: false,
      prefix: 'angkorgate:',
    };
  }

  @Get('.well-known/openid-configuration')
  @SkipTransform()
  @ApiOperation({ summary: 'Redirect root OIDC discovery to /oidc/.well-known/openid-configuration' })
  @ApiResponse({ status: 302, description: 'Redirect to OIDC discovery endpoint' })
  rootDiscovery(@Res() res: Response) {
    return res.redirect('/oidc/.well-known/openid-configuration');
  }
}
