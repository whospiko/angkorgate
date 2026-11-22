import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);

    async send(phone: string, message: string): Promise<void> {
        // External SMS provider dispatch (e.g. Twilio, Vonage, AWS SNS)
        this.logger.warn(`SMS stub: ${phone} → ${message}`);
    }
}