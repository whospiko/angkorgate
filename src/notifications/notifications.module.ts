import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';
import { MAIL_PROVIDER } from './interfaces/mail-provider.interface';
import { ConsoleMailProvider } from './providers/console-mail.provider';
import { SmtpMailProvider } from './providers/smtp-mail.provider';

@Global()
@Module({
    providers: [
        MailService,
        SmsService,
        {
            provide: MAIL_PROVIDER,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const useSmtp = config.get<string>('MAIL_PROVIDER') === 'smtp';
                return useSmtp ? new SmtpMailProvider(config) : new ConsoleMailProvider();
            },
        },
    ],
    exports: [MailService, SmsService],
})
export class NotificationsModule { }