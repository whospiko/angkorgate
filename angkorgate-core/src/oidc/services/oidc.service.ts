import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Provider, Configuration, KoaContextWithOIDC, JWK, ClientMetadata } from 'oidc-provider';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { importPKCS8, exportJWK } from 'jose';
import { OidcAdapterService } from '../adapters/oidc.adapter';
import { UsersService } from '../../users/services/users.service';
import { RbacService } from '../../rbac/services/rbac.service';

@Injectable()
export class OidcService implements OnModuleInit {
    private readonly logger = new Logger(OidcService.name);
    public oidc: Provider;

    constructor(
        private readonly config: ConfigService,
        private readonly adapterService: OidcAdapterService,
        private readonly usersService: UsersService,
        private readonly rbacService: RbacService,
    ) { }

    async onModuleInit() {
        const issuer = this.config.get<string>('OIDC_ISSUER') || 'http://localhost:8080/oidc';
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
                redirect_uris: ['http://localhost:5173/callback', 'http://localhost:3000/callback'],
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
            },

            clients: staticClients,

            findAccount: async (ctx: KoaContextWithOIDC, id: string) => {
                const user = await this.usersService.findById(id);
                if (!user) return undefined;
                const roles = await this.rbacService.getUserRoleCodes(id);
                const permissions = await this.rbacService.getUserPermissions(id);

                return {
                    accountId: id,
                    async claims() {
                        return {
                            sub: id,
                            email: user.email,
                            email_verified: user.isEmailVerified,
                            phone: user.phone,
                            phone_verified: user.isPhoneVerified,
                            roles: roles,
                            permissions: permissions,
                            'https://angkorgate.com/roles': roles,
                            'https://angkorgate.com/permissions': permissions,
                        };
                    },
                };
            },

            claims: {
                openid: ['sub'],
                email: ['email', 'email_verified'],
                phone: ['phone', 'phone_verified'],
                profile: ['name', 'roles', 'permissions'],
                roles: ['roles', 'https://angkorgate.com/roles'],
                permissions: ['permissions', 'https://angkorgate.com/permissions'],
            },

            scopes: ['openid', 'email', 'profile', 'phone', 'roles', 'permissions', 'offline_access'],

            features: {
                devInteractions: { enabled: false },
                clientCredentials: { enabled: true },
                introspection: { enabled: true },
                revocation: { enabled: true },
                userinfo: { enabled: true },
                rpInitiatedLogout: { enabled: true },
            },

            formats: {
                customizers: {
                    jwt: async (ctx: KoaContextWithOIDC, token: any, jwt: any) => {
                        if (token.accountId) {
                            const roles = await this.rbacService.getUserRoleCodes(token.accountId);
                            const permissions = await this.rbacService.getUserPermissions(token.accountId);
                            jwt.payload.roles = roles;
                            jwt.payload.permissions = permissions;
                            jwt.payload['https://angkorgate.com/roles'] = roles;
                            jwt.payload['https://angkorgate.com/permissions'] = permissions;
                        }
                    },
                },
            },

            pkce: {
                required: (ctx: KoaContextWithOIDC, client: any) => client.tokenEndpointAuthMethod === 'none',
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
        };

        this.oidc = new Provider(issuer, configuration);
        this.oidc.proxy = true;

        this.logger.log(`OIDC Provider initialized at ${issuer}`);
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
