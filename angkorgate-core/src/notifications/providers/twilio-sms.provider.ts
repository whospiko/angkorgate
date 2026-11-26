import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendSmsOptions, SmsProvider } from '../interfaces/sms-provider.interface';

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
    private readonly logger = new Logger(TwilioSmsProvider.name);
    private readonly accountSid: string;
    private readonly authToken: string;
    private readonly fromNumber: string;

    constructor(config: ConfigService) {
        this.accountSid = config.get<string>('TWILIO_ACCOUNT_SID') ?? '';
        this.authToken = config.get<string>('TWILIO_AUTH_TOKEN') ?? '';
        this.fromNumber = config.get<string>('TWILIO_FROM_NUMBER') ?? '';
    }

    async send(options: SendSmsOptions): Promise<void> {
        if (!this.accountSid || !this.authToken || !this.fromNumber) {
            throw new Error(
                'Twilio SMS provider is not configured (missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER)',
            );
        }

        const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.accountSid)}/Messages.json`;
        const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
        const body = new URLSearchParams({
            To: options.to,
            From: this.fromNumber,
            Body: options.message,
        });

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
}
