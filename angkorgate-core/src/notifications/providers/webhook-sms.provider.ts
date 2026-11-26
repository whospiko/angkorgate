import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendSmsOptions, SmsProvider } from '../interfaces/sms-provider.interface';

@Injectable()
export class WebhookSmsProvider implements SmsProvider {
    private readonly logger = new Logger(WebhookSmsProvider.name);
    private readonly webhookUrl: string;
    private readonly webhookSecret?: string;

    constructor(config: ConfigService) {
        this.webhookUrl = config.get<string>('SMS_WEBHOOK_URL') ?? '';
        this.webhookSecret = config.get<string>('SMS_WEBHOOK_SECRET');
    }

    async send(options: SendSmsOptions): Promise<void> {
        if (!this.webhookUrl) {
            throw new Error('Webhook SMS provider is not configured (missing SMS_WEBHOOK_URL)');
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (this.webhookSecret) {
            headers['X-SMS-Webhook-Secret'] = this.webhookSecret;
        }

        const res = await fetch(this.webhookUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                to: options.to,
                message: options.message,
                timestamp: new Date().toISOString(),
            }),
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            this.logger.error(`Webhook SMS dispatch failed (${res.status}): ${errText}`);
            throw new Error(`Webhook SMS dispatch failed with status ${res.status}`);
        }
    }
}
