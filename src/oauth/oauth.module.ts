import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OauthProvider } from './entities/oauth-provider.entity';
import { OauthAccount } from './entities/oauth-account.entity';
import { User } from '../users/entities/user.entity';
import { OauthConfigService } from './oauth-config.service';
import { OauthProvidersService } from './oauth-providers.service';
import { OauthLoginService } from './oauth-login.service';
import { GoogleStrategyProvider } from './strategies/google.strategy.factory';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { OauthAuthController } from './controllers/oauth-auth.controller';
import { OauthAdminController } from './controllers/oauth-admin.controller';
import { UsersModule } from '../users/users.module';
import { RbacModule } from '../rbac/rbac.module';
import { CustomersModule } from '../customers/customers.module';
import { AuthModule } from '../auth/auth.module';
import { OauthAccountsService } from './oauth-accounts.service';
import { OauthRedirectService } from './oauth-redirect.service';
import { OauthTicketService } from './oauth-ticket.service';
import { OauthTicket } from './entities/oauth-ticket.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([OauthProvider, OauthAccount, OauthTicket, User]),
        UsersModule,
        RbacModule,
        CustomersModule,
        AuthModule, // for issueTokensForUser
    ],
    controllers: [OauthAuthController, OauthAdminController],
    providers: [
        OauthConfigService,
        OauthProvidersService,
        OauthAccountsService,
        OauthLoginService,
        OauthRedirectService,   // 👈 new
        OauthTicketService,     // 👈 new
        GoogleOauthGuard,
        GoogleStrategyProvider,
    ],
    exports: [OauthConfigService, OauthLoginService, OauthAccountsService],
})
export class OauthModule { }