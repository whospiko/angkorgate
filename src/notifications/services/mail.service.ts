import { Inject, Injectable } from '@nestjs/common';
import {
    MAIL_PROVIDER,
    type MailProvider,
    type SendMailOptions,
} from '../interfaces/mail-provider.interface';

@Injectable()
export class MailService {
    constructor(
        @Inject(MAIL_PROVIDER) private readonly provider: MailProvider,
    ) { }

    async send(options: SendMailOptions): Promise<void> {
        await this.provider.send(options);
    }
}