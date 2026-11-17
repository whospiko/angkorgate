import { config } from 'dotenv';
import { AuditService } from '../src/audit/services/audit.service';

config({ path: '.env.test', quiet: true });

jest.setTimeout(60000);

afterEach(async () => {
    await AuditService.flush();
});