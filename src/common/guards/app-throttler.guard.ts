import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
    protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
        if (process.env.NODE_ENV !== 'test') return false;
        const req = context.switchToHttp().getRequest<Request>();
        // In test mode, skip login so repeated loginAs() in beforeEach doesn't hit 429,
        // while allowing other throttled routes (e.g. register) to be tested for 429.
        return req.path?.includes('/login') ?? false;
    }
}
