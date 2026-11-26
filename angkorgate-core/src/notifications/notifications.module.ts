import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './services/mail.service';
import { SmsService } from './services/sms.service';
import { DevOutboxService } from './services/dev-outbox.service';
import { MAIL_PROVIDER } from './interfaces/mail-provider.interface';
import { ConsoleMailProvider } from './providers/console-mail.provider';
import { SmtpMailProvider } from './providers/smtp-mail.provider';
import { SMS_PROVIDER } from './interfaces/sms-provider.interface';
import { ConsoleSmsProvider } from './providers/console-sms.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { WebhookSmsProvider } from './providers/webhook-sms.provider';

@Global()
@Module({
    providers: [
        MailService,
        SmsService,
        DevOutboxService,
        {
            provide: MAIL_PROVIDER,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const useSmtp = config.get<string>('MAIL_PROVIDER') === 'smtp';
                return useSmtp ? new SmtpMailProvider(config) : new ConsoleMailProvider();
            },
        },
        {
            provide: SMS_PROVIDER,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const provider = (config.get<string>('SMS_PROVIDER') ?? 'console').toLowerCase();
                if (provider === 'twilio') return new TwilioSmsProvider(config);
                if (provider === 'webhook') return new WebhookSmsProvider(config);
                return new ConsoleSmsProvider();
            },
        },
    ],
    exports: [MailService, SmsService, DevOutboxService],
})
export class NotificationsModule { }
