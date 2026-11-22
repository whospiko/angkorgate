import { Injectable, Logger } from '@nestjs/common';
import { MailProvider, SendMailOptions } from '../interfaces/mail-provider.interface';
import { stripHtml } from '../../common/utils/string.util';

@Injectable()
export class ConsoleMailProvider implements MailProvider {
    private readonly logger = new Logger('ConsoleMail');

    async send(options: SendMailOptions): Promise<void> {
        this.logger.log(
            `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📧 To:      ${options.to}\n` +
            `   Subject: ${options.subject}\n` +
            `   Body:\n${options.text ?? stripHtml(options.html)}\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        );
    }
}