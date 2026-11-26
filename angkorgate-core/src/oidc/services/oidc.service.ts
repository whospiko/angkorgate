import { Injectable, OnModuleInit, Logger, Optional } from '@nestjs/common';
import { Provider, Configuration, KoaContextWithOIDC, JWK, ClientMetadata, AccountClaims } from 'oidc-provider';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { importPKCS8, exportJWK } from 'jose';
import { OidcAdapterService } from '../adapters/oidc.adapter';
import { UsersService } from '../../users/services/users.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { OauthProvider } from '../../oauth/entities/oauth-provider.entity';

const OIDC_SETTINGS_CODE = '_oidc_settings';

@Injectable()
export class OidcService implements OnModuleInit {
    private readonly logger = new Logger(OidcService.name);
    public oidc: Provider;
    private savedConfiguration: Configuration | null = null;
    private consoleUrlOverride: string | null = null;

    constructor(
        private readonly config: ConfigService,
        private readonly adapterService: OidcAdapterService,
        private readonly usersService: UsersService,
        private readonly rbacService: RbacService,
        @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
    ) { }

    async onModuleInit() {
        let issuer = this.config.get<string>('OIDC_ISSUER') || 'http://localhost:8080/oidc';

        try {
            const repo = this.dataSource?.getRepository(OauthProvider);
            const row = await repo?.findOne({ where: { code: OIDC_SETTINGS_CODE } });
            if (row?.extraConfig) {
                if (typeof row.extraConfig.issuer === 'string' && row.extraConfig.issuer.trim()) {
                    issuer = row.extraConfig.issuer.trim().replace(/\/+$/, '');
                }
                if (typeof row.extraConfig.consoleUrl === 'string' && row.extraConfig.consoleUrl.trim()) {
                    this.consoleUrlOverride = row.extraConfig.consoleUrl.trim().replace(/\/+$/, '');
                }
            }
        } catch {
            // Ignore when running unit tests without DataSource
        }
        const cookieSecret = this.config.get<string>('JWT_ACCESS_SECRET') || 'angkorgate-cookie-secret-min-32-chars';

        const jwkKeys = await this.resolveJwks();

        const staticClients: ClientMetadata[] = [];
        const envClientId = this.config.get<string>('OIDC_CLIENT_ID');
        if (envClientId) {
            const envSecret = this.config.get<string>('OIDC_CLIENT_SECRET');
            staticClients.push({
                client_id: envClientId,
                client_name: 'Default Client Application',
                client_secret: envSecret,
                redirect_uris: ['http://localhost:5173/callback', 'http://localhost:4000/callback', 'http://localhost:3000/callback'],
                grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
                response_types: ['code'],
                token_endpoint_auth_method: envSecret ? 'client_secret_basic' : 'none',
            });
        }

        const configuration: Configuration = {
            adapter: (name: string) => this.adapterService.createAdapter(name),

            jwks: {
                keys: jwkKeys,
            },

            cookies: {
                keys: [cookieSecret],
                short: {
                    path: '/',
                    sameSite: 'lax',
                },
                long: {
                    path: '/',
                    sameSite: 'lax',
                },
            },

            clients: staticClients,

            findAccount: async (ctx: KoaContextWithOIDC, id: string) => {
                const user = await this.usersService.findById(id);
                if (!user) return undefined;
                const roles = await this.rbacService.getUserRoleCodes(id);
                const permissions = await this.rbacService.getUserPermissions(id);

                return {
                    accountId: id,
                    async claims(use?: string, scope?: string): Promise<AccountClaims> {
                        const scopeList = typeof scope === 'string' ? scope.split(' ') : [];
                        const shouldIncludeAll = !scope || scopeList.length === 0;

                        const claimsObj: AccountClaims = {
                            sub: id,
                        };

                        if (shouldIncludeAll || scopeList.includes('email')) {
                            claimsObj.email = user.email;
                            claimsObj.email_verified = user.isEmailVerified;
                        }

                        if (shouldIncludeAll || scopeList.includes('profile')) {
                            claimsObj.name = user.email || id;
                            claimsObj.preferred_username = user.email || id;
                        }

                        if (shouldIncludeAll || scopeList.includes('phone')) {
                            claimsObj.phone = user.phone;
                            claimsObj.phone_verified = user.isPhoneVerified;
                        }

                        if (shouldIncludeAll || scopeList.includes('roles')) {
                            claimsObj.roles = roles;
                            claimsObj['https://angkorgate.com/roles'] = roles;
                        }

                        if (shouldIncludeAll || scopeList.includes('permissions')) {
                            claimsObj.permissions = permissions;
                            claimsObj['https://angkorgate.com/permissions'] = permissions;
                        }

                        return claimsObj;
                    },
                };
            },

            claims: {
                openid: ['sub'],
                email: ['email', 'email_verified'],
                phone: ['phone', 'phone_verified'],
                profile: ['name', 'preferred_username', 'roles', 'permissions'],
                roles: ['roles', 'https://angkorgate.com/roles'],
                permissions: ['permissions', 'https://angkorgate.com/permissions'],
            },

            scopes: [
                'openid',
                'email',
                'profile',
                'phone',
                'roles',
                'permissions',
                'offline_access',
            ],

            conformIdTokenClaims: false,

            features: {
                devInteractions: { enabled: false },
                clientCredentials: { enabled: true },
                introspection: { enabled: true },
                revocation: { enabled: true },
                userinfo: { enabled: true },
                rpInitiatedLogout: {
                    enabled: true,
                    logoutSource: (ctx: KoaContextWithOIDC, form: string) => {
                        ctx.body = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Signing out...</title></head>
<body style="background:#09090b;color:#f4f4f5;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <p style="font-size:14px;color:#a1a1aa">Signing out of AngkorGate...</p>
  ${form}
  <script>
    const f = document.getElementById('op.logoutForm');
    if (f) {
      const i = document.createElement('input');
      i.type = 'hidden';
      i.name = 'logout';
      i.value = 'yes';
      f.appendChild(i);
      f.submit();
    }
  </script>
</body>
</html>`;
                    },
                },
            },

            formats: {
                customizers: {
                    jwt: async (ctx: KoaContextWithOIDC, token: any, jwt: any) => {
                        if (token.accountId) {
                            const tokenScope = token.scope ? String(token.scope).split(' ') : [];
                            const shouldIncludeAll = tokenScope.length === 0;

                            if (shouldIncludeAll || tokenScope.includes('roles')) {
                                const roles = await this.rbacService.getUserRoleCodes(token.accountId);
                                jwt.payload.roles = roles;
                                jwt.payload['https://angkorgate.com/roles'] = roles;
                            }

                            if (shouldIncludeAll || tokenScope.includes('permissions')) {
                                const permissions = await this.rbacService.getUserPermissions(token.accountId);
                                jwt.payload.permissions = permissions;
                                jwt.payload['https://angkorgate.com/permissions'] = permissions;
                            }
                        }
                    },
                },
            },

            pkce: {
                required: (ctx: KoaContextWithOIDC, client: any) => {
                    return Boolean(client.require_pkce);
                },
            },

            issueRefreshToken: (ctx: KoaContextWithOIDC, client: any) => {
                return client.grantTypes.includes('refresh_token');
            },

            interactions: {
                url(ctx: KoaContextWithOIDC, interaction: any) {
                    return `/oidc/interaction/${interaction.uid}`;
                },
            },

            routes: {
                authorization: '/auth',
                token: '/token',
                jwks: '/jwks',
                userinfo: '/me',
                end_session: '/session/end',
                introspection: '/introspect',
                revocation: '/revoke',
            },

            clientBasedCORS(ctx: any, origin: string, client: any) {
                return true;
            },
        };

        this.savedConfiguration = configuration;
        this.oidc = new Provider(issuer, configuration);
        this.oidc.proxy = true;

        this.logger.log(`OIDC Provider initialized at ${issuer}`);
    }

    getConsoleUrl(): string {
        if (this.consoleUrlOverride) {
            return this.consoleUrlOverride;
        }
        return (
            this.config.get<string>('CONSOLE_URL') ||
            this.config.get<string>('APP_WEB_URL') ||
            'http://localhost:4000'
        ).replace(/\/+$/, '');
    }

    getSettings(): { issuer: string; consoleUrl: string } {
        return {
            issuer: this.oidc?.issuer ?? (this.config.get<string>('OIDC_ISSUER') || 'http://localhost:8080/oidc'),
            consoleUrl: this.getConsoleUrl(),
        };
    }

    async updateSettings(patch: {
        issuer?: string;
        consoleUrl?: string;
    }): Promise<{ issuer: string; consoleUrl: string }> {
        const nextIssuer = patch.issuer
            ? patch.issuer.trim().replace(/\/+$/, '')
            : this.oidc.issuer;
        const nextConsoleUrl = patch.consoleUrl
            ? patch.consoleUrl.trim().replace(/\/+$/, '')
            : this.getConsoleUrl();

        try {
            const repo = this.dataSource?.getRepository(OauthProvider);
            if (repo) {
                const existing = await repo.findOne({ where: { code: OIDC_SETTINGS_CODE } });
                const record = existing
                    ? Object.assign(existing, {
                          extraConfig: {
                              ...(existing.extraConfig ?? {}),
                              issuer: nextIssuer,
                              consoleUrl: nextConsoleUrl,
                          },
                      })
                    : repo.create({
                          code: OIDC_SETTINGS_CODE,
                          name: 'OIDC Settings',
                          isActive: false,
                          clientId: null,
                          clientSecret: null,
                          scopes: null,
                          extraConfig: {
                              issuer: nextIssuer,
                              consoleUrl: nextConsoleUrl,
                          },
                      });
                await repo.save(record);
            }
        } catch (err) {
            this.logger.warn(`Failed to persist OIDC settings to DB: ${(err as Error).message}`);
        }

        this.consoleUrlOverride = nextConsoleUrl;
        if (patch.issuer && this.savedConfiguration && nextIssuer !== this.oidc.issuer) {
            this.oidc = new Provider(nextIssuer, this.savedConfiguration);
            this.oidc.proxy = true;
            this.logger.log(`OIDC Provider dynamically reinitialized at ${nextIssuer}`);
        }

        return this.getSettings();
    }

    public callback() {
        const cb = this.oidc.callback();
        const issuerUrl = new URL(this.oidc.issuer);
        const issuerPath = issuerUrl.pathname.replace(/\/$/, '');

        return (req: any, res: any) => {
            if (issuerPath && req.url.startsWith(issuerPath)) {
                const originalUrl = req.url;
                const strippedUrl = req.url.slice(issuerPath.length) || '/';
                req.url = strippedUrl;
                if (!req.baseUrl) {
                    req.baseUrl = issuerPath;
                }
                return cb(req, res);
            }
            return cb(req, res);
        };
    }

    private async resolveJwks(): Promise<JWK[]> {
        // 1. Direct JWKS in env
        const envJwks = this.config.get<string>('OIDC_JWKS');
        if (envJwks) {
            try {
                const parsed = JSON.parse(envJwks);
                return parsed.keys ?? [parsed];
            } catch (e) {
                this.logger.warn(`Failed to parse OIDC_JWKS from env: ${(e as Error).message}`);
            }
        }

        // 2. Private key from env
        const envPrivateKey = this.config.get<string>('OIDC_PRIVATE_KEY');
        if (envPrivateKey) {
            const privateKey = await importPKCS8(envPrivateKey.replace(/\\n/g, '\n'), 'RS256', { extractable: true });
            const jwk = await exportJWK(privateKey);
            return [{ ...jwk, use: 'sig', alg: 'RS256', kid: 'angkorgate-key-1' } as JWK];
        }

        // 3. Private key from disk
        const keyDir = path.join(process.cwd(), 'oidc-keys');
        const keyPath = path.join(keyDir, 'private.pem');

        if (!fs.existsSync(keyPath)) {
            this.logger.log('No OIDC private key found. Generating new 2048-bit RSA key pair...');
            if (!fs.existsSync(keyDir)) {
                fs.mkdirSync(keyDir, { recursive: true });
            }

            const { privateKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            });

            fs.writeFileSync(keyPath, privateKey, { mode: 0o600 });
            this.logger.log(`Saved new RSA private key to ${keyPath}`);
        }

        const privateKeyPem = fs.readFileSync(keyPath, 'utf8');
        const privateKey = await importPKCS8(privateKeyPem, 'RS256', { extractable: true });
        const jwk = await exportJWK(privateKey);

        return [
            {
                ...jwk,
                use: 'sig',
                alg: 'RS256',
                kid: 'angkorgate-key-1',
            } as JWK,
        ];
    }
}
