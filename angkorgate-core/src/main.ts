import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Add Bearer Auth to your DocumentBuilder config
  const config = new DocumentBuilder()
    .setTitle('AngkorGate IAM API')
    .setDescription('Open-Source Identity and Access Management with OAuth 2.0, OpenID Connect 1.0, RBAC, and Multi-Tenancy.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Bearer token',
        in: 'header',
      },
      'bearerAuth', // Reference name used in @ApiBearerAuth('bearerAuth')
    )
    .addTag('Auth', 'Authentication, registration, tokens, and password management')
    .addTag('Auth - MFA', 'Multi-Factor Authentication (TOTP and backup codes)')
    .addTag('Auth - Email Change', 'Self-service email address change flow')
    .addTag('OIDC', 'OpenID Connect 1.0 & OAuth 2.0 Authorization Server Endpoints')
    .addTag('Apps', 'Client application management (OAuth / OIDC clients)')
    .addTag('Users', 'User management, status, and administration')
    .addTag('RBAC - Roles', 'Role management and assignment')
    .addTag('RBAC - Permissions', 'Permission catalog and user permission overrides')
    .addTag('OAuth Providers - Admin', 'External OAuth/social provider management')
    .addTag('OAuth Providers - Auth', 'External OAuth/social login endpoints')
    .addTag('Customers', 'Customer management')
    .addTag('Customer Contacts', 'Customer contact management')
    .addTag('Employees', 'Employee, position, department, and schedule management')
    .addTag('Audit', 'Audit trail logs and query')
    .addTag('Cache', 'Distributed Redis & In-Memory Cache engine')
    .addTag('System', 'Health and system discovery')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // 2. Inject custom JavaScript to intercept the login fetch request
  const customJsStr = `
    window.addEventListener('load', function() {
      setTimeout(() => {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
          const response = await originalFetch(...args);
          
          // Note: Adjust '/login' if your auth route is different (e.g., '/auth/login')
          if (typeof args[0] === 'string' && args[0].includes('/login') && (response.status === 200 || response.status === 201)) {
            response.clone().json().then(data => {
              if (data && data.accessToken) {
                window.ui.authActions.authorize({
                  bearerAuth: {
                    name: 'bearerAuth',
                    schema: {
                      type: 'http',
                      in: 'header',
                      name: 'Authorization',
                      description: ''
                    },
                    value: data.accessToken
                  }
                });
                console.log('Swagger UI automatically authenticated.');
              }
            }).catch(err => console.error('Failed to parse login response', err));
          }
          return response;
        };
      }, 500);
    });
  `;

  // 3. Apply the custom JS and persist authorization in Swagger options
  SwaggerModule.setup('api', app, document, {
    customJsStr: customJsStr,
    swaggerOptions: {
      persistAuthorization: true, // Keeps you logged in even if you refresh the page
    },
  });

  // Your existing global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`🚀 AngkorGate Core running on http://localhost:${port}`);
  console.log(`🔑 OIDC Discovery at http://localhost:${port}/oidc/.well-known/openid-configuration`);

}
void bootstrap();
