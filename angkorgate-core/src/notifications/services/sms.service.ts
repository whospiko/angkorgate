import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
    SMS_PROVIDER,
    type SmsProvider,
} from '../interfaces/sms-provider.interface';
import { ConsoleSmsProvider } from '../providers/console-sms.provider';
import { RuntimeConfigService } from '../../system/services/runtime-config.service';
import { DevOutboxService } from './dev-outbox.service';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private readonly activeProvider: SmsProvider;
    private readonly consoleFallback = new ConsoleSmsProvider();

    constructor(
        @Optional() @Inject(SMS_PROVIDER) provider?: SmsProvider,
        @Optional() private readonly runtimeConfig?: RuntimeConfigService,
        @Optional() private readonly devOutbox?: DevOutboxService,
    ) {
        this.activeProvider = provider ?? this.consoleFallback;
    }

    async send(phone: string, message: string): Promise<void> {
        if (!this.runtimeConfig) {
            await this.activeProvider.send({ to: phone, message });
            this.devOutbox?.record({ channel: 'sms', to: phone, body: message });
            return;
        }

        const providerName = (this.runtimeConfig.get('SMS_PROVIDER', 'console') ?? 'console').toLowerCase();

        if (providerName === 'twilio') {
            await this.sendViaTwilio(phone, message);
            return;
        }

        if (providerName === 'webhook') {
            await this.sendViaWebhook(phone, message);
            return;
        }

        await this.consoleFallback.send({ to: phone, message });
        this.devOutbox?.record({ channel: 'sms', to: phone, body: message });
    }

    private async sendViaTwilio(to: string, message: string): Promise<void> {
        const accountSid = this.runtimeConfig?.get('TWILIO_ACCOUNT_SID', '') ?? '';
        const authToken = this.runtimeConfig?.get('TWILIO_AUTH_TOKEN', '') ?? '';
        const fromNumber = this.runtimeConfig?.get('TWILIO_FROM_NUMBER', '') ?? '';

        if (!accountSid || !authToken || !fromNumber) {
            throw new Error(
                'Twilio SMS provider is not configured (missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER)',
            );
        }

        const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
        const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const body = new URLSearchParams({ To: to, From: fromNumber, Body: message });

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            this.logger.error(`Twilio SMS dispatch failed (${res.status}): ${errText}`);
            throw new Error(`Twilio SMS dispatch failed with status ${res.status}`);
        }
    }

    private async sendViaWebhook(to: string, message: string): Promise<void> {
        const webhookUrl = this.runtimeConfig?.get('SMS_WEBHOOK_URL', '') ?? '';
        const webhookSecret = this.runtimeConfig?.get('SMS_WEBHOOK_SECRET', '') ?? '';

        if (!webhookUrl) {
            throw new Error('Webhook SMS provider is not configured (missing SMS_WEBHOOK_URL)');
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (webhookSecret) {
            headers['X-SMS-Webhook-Secret'] = webhookSecret;
        }

        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ to, message, timestamp: new Date().toISOString() }),
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            this.logger.error(`Webhook SMS dispatch failed (${res.status}): ${errText}`);
            throw new Error(`Webhook SMS dispatch failed with status ${res.status}`);
        }
    }
}
