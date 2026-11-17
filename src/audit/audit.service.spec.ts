import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { createMockRepository } from '../../test/mocks/repository.mock';

describe('AuditService', () => {
    let service: AuditService;
    let repo: ReturnType<typeof createMockRepository>;

    beforeEach(async () => {
        repo = createMockRepository<AuditLog>();
        const module = await Test.createTestingModule({
            providers: [
                AuditService,
                { provide: getRepositoryToken(AuditLog), useValue: repo },
            ],
        }).compile();
        service = module.get(AuditService);
    });

    it('writes an audit row', async () => {
        repo.create.mockImplementation((d) => d);
        repo.save.mockResolvedValue({ id: '1' } as never);

        await service.log({
            action: 'test.action',
            entity: 'test',
            entityId: 'e1',
            actorId: 'u1',
        });

        expect(repo.save).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'test.action',
                entity: 'test',
                actorId: 'u1',
            }),
        );
    });

    it('never throws on DB errors (fire-and-forget)', async () => {
        const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
        repo.create.mockImplementation((d) => d);
        repo.save.mockRejectedValue(new Error('DB is down'));

        // Should NOT throw
        await expect(
            service.log({ action: 'x', entity: 'y' }),
        ).resolves.toBeUndefined();

        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });
});