import { Injectable, Logger } from '@nestjs/common';
import { SendSmsOptions, SmsProvider } from '../interfaces/sms-provider.interface';

@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
    private readonly logger = new Logger('ConsoleSms');

    async send(options: SendSmsOptions): Promise<void> {
        this.logger.log(
            `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📱 SMS To:  ${options.to}\n` +
            `   Message: ${options.message}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        );
    }
}
