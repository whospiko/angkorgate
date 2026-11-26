import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
    MAIL_PROVIDER,
    type MailProvider,
    type SendMailOptions,
} from '../interfaces/mail-provider.interface';
import { ConsoleMailProvider } from '../providers/console-mail.provider';
import { RuntimeConfigService } from '../../system/services/runtime-config.service';
import { DevOutboxService } from './dev-outbox.service';
import { stripHtml } from '../../common/utils/string.util';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private cachedSignature = '';
    private cachedTransporter: Transporter | null = null;
    private readonly consoleFallback = new ConsoleMailProvider();

    constructor(
        @Optional() @Inject(MAIL_PROVIDER) private readonly provider?: MailProvider,
        @Optional() private readonly runtimeConfig?: RuntimeConfigService,
        @Optional() private readonly devOutbox?: DevOutboxService,
    ) { }

    async send(options: SendMailOptions): Promise<void> {
        if (!this.runtimeConfig) {
            if (this.provider) {
                await this.provider.send(options);
                return;
            }
            await this.consoleFallback.send(options);
            this.devOutbox?.record({
                channel: 'email',
                to: options.to,
                subject: options.subject,
                body: options.text ?? stripHtml(options.html),
            });
            return;
        }

        const providerName = (this.runtimeConfig.get('MAIL_PROVIDER', 'console') ?? 'console').toLowerCase();
        if (providerName !== 'smtp') {
            await this.consoleFallback.send(options);
            this.devOutbox?.record({
                channel: 'email',
                to: options.to,
                subject: options.subject,
                body: options.text ?? stripHtml(options.html),
            });
            return;
        }

        const host = this.runtimeConfig.get('MAIL_HOST', '') ?? '';
        const port = this.runtimeConfig.getNumber('MAIL_PORT', 587);
        const secure = this.runtimeConfig.getBoolean('MAIL_SECURE', false);
        const user = this.runtimeConfig.get('MAIL_USER', '') ?? '';
        const pass = this.runtimeConfig.get('MAIL_PASS', '') ?? '';
        const from = this.runtimeConfig.get('MAIL_FROM', 'no-reply@localhost') ?? 'no-reply@localhost';

        const signature = `${host}|${port}|${secure}|${user}|${pass}`;
        if (!this.cachedTransporter || this.cachedSignature !== signature) {
            this.cachedTransporter = nodemailer.createTransport({
                host,
                port,
                secure,
                auth: user ? { user, pass } : undefined,
            });
            this.cachedSignature = signature;
        }

        try {
            await this.cachedTransporter.sendMail({
                from,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            });
        } catch (err) {
            this.logger.error(`Failed to send email to ${options.to}`, err);
            throw err;
        }
    }
}
