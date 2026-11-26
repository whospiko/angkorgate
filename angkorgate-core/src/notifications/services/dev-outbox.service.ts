import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type DevOutboxChannel = 'email' | 'sms';

export interface DevOutboxMessage {
    id: string;
    channel: DevOutboxChannel;
    to: string;
    subject?: string;
    body: string;
    extractedCode: string | null;
    extractedLinks: string[];
    createdAt: string;
}

const MAX_OUTBOX_MESSAGES = 50;

@Injectable()
export class DevOutboxService {
    private readonly messages: DevOutboxMessage[] = [];

    record(entry: {
        channel: DevOutboxChannel;
        to: string;
        subject?: string;
        body: string;
    }): DevOutboxMessage {
        const codeMatch = entry.body.match(/\b(\d{6})\b/);
        const urlMatches = entry.body.match(/https?:\/\/[^\s"'<>]+/g) ?? [];

        const item: DevOutboxMessage = {
            id: randomUUID(),
            channel: entry.channel,
            to: entry.to,
            subject: entry.subject,
            body: entry.body,
            extractedCode: codeMatch ? codeMatch[1] : null,
            extractedLinks: Array.from(new Set(urlMatches)),
            createdAt: new Date().toISOString(),
        };

        this.messages.unshift(item);
        if (this.messages.length > MAX_OUTBOX_MESSAGES) {
            this.messages.length = MAX_OUTBOX_MESSAGES;
        }

        return item;
    }

    list(channel?: DevOutboxChannel): DevOutboxMessage[] {
        if (!channel) return [...this.messages];
        return this.messages.filter((m) => m.channel === channel);
    }

    clear(): void {
        this.messages.length = 0;
    }
}
