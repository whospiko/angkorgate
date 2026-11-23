import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';

/**
 * Only instantiates GoogleStrategy if OAUTH_ENABLED=true AND Google clientId
 * is configured. Otherwise returns `null` — the guard will then 404 the
 * endpoints cleanly.
 */
export const GoogleStrategyProvider: Provider = {
    provide: GoogleStrategy,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
        if (config.get<boolean>('oauth.enabled') !== true) return null;
        return new GoogleStrategy(config);
    },
};