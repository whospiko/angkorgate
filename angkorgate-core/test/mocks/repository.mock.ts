import { ObjectLiteral, Repository } from 'typeorm';

export type MockRepository<T extends ObjectLiteral = any> = {
    [P in keyof Repository<T>]: jest.Mock;
} & {
    manager: {
        transaction: jest.Mock;
    };
};

export function createMockRepository<T extends ObjectLiteral = any>(): MockRepository<T> {
    const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getExists: jest.fn().mockResolvedValue(false),
        getOne: jest.fn().mockResolvedValue(null),
        getRawOne: jest.fn().mockResolvedValue(null),
        getRawMany: jest.fn().mockResolvedValue([]),
        getMany: jest.fn().mockResolvedValue([]),
    };

    return {
        find: jest.fn(),
        findOne: jest.fn(),
        findOneOrFail: jest.fn(),
        findAndCount: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        softDelete: jest.fn(),
        restore: jest.fn(),
        count: jest.fn(),
        exists: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        manager: {
            transaction: jest.fn((cb: (em: unknown) => unknown) => cb({
                createQueryBuilder: jest.fn().mockReturnValue(qb),
            })),
        },
    } as unknown as MockRepository<T>;
}