import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Add Bearer Auth to your DocumentBuilder config
  const config = new DocumentBuilder()
    .setTitle('Easy Auth API')
    .setDescription('provide auth with rbac strategy.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'bearerAuth', // This is the reference name you will use in @ApiBearerAuth()
    )
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

  await app.listen(process.env.PORT ?? 3000);

}
void bootstrap();
