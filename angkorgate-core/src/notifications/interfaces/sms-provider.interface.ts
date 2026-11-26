export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export interface SendSmsOptions {
    to: string;
    message: string;
}

export interface SmsProvider {
    send(options: SendSmsOptions): Promise<void>;
}
