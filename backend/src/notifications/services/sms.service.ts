import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);

    async send(phone: string, message: string): Promise<void> {
        // TODO: wire Twilio / Vonage / local provider
        this.logger.warn(`SMS stub: ${phone} → ${message}`);
    }
}