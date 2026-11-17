import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { MailProvider, SendMailOptions } from '../interfaces/mail-provider.interface';

@Injectable()
export class SmtpMailProvider implements MailProvider {
    private readonly logger = new Logger(SmtpMailProvider.name);
    private readonly transporter: Transporter;
    private readonly from: string;

    constructor(config: ConfigService) {
        this.from = config.get<string>('MAIL_FROM') ?? 'no-reply@localhost';
        this.transporter = nodemailer.createTransport({
            host: config.get<string>('MAIL_HOST'),
            port: config.get<number>('MAIL_PORT') ?? 587,
            secure: config.get<boolean>('MAIL_SECURE') ?? false,
            auth: config.get<string>('MAIL_USER')
                ? {
                    user: config.get<string>('MAIL_USER'),
                    pass: config.get<string>('MAIL_PASS'),
                }
                : undefined,
        });
    }

    async send(options: SendMailOptions): Promise<void> {
        try {
            await this.transporter.sendMail({
                from: this.from,
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