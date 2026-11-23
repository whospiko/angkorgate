import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Scope } from '../entities/scope.entity';
import { CreateScopeDto } from '../dto/create-scope.dto';

@Injectable()
export class ScopesService {
    constructor(
        @InjectRepository(Scope)
        private readonly scopeRepo: Repository<Scope>,
    ) { }

    async findAll(): Promise<Scope[]> {
        return this.scopeRepo.find({ order: { name: 'ASC' } });
    }

    async findById(id: string): Promise<Scope | null> {
        return this.scopeRepo.findOne({ where: { id } });
    }

    async findByName(name: string): Promise<Scope | null> {
        return this.scopeRepo.findOne({ where: { name } });
    }

    async findByIds(ids: string[]): Promise<Scope[]> {
        if (!ids || ids.length === 0) return [];
        return this.scopeRepo.findBy({ id: In(ids) });
    }

    async findDefaultScopes(): Promise<Scope[]> {
        return this.scopeRepo.find({ where: { isDefault: true } });
    }

    async create(dto: CreateScopeDto): Promise<Scope> {
        const existing = await this.findByName(dto.name);
        if (existing) {
            throw new ConflictException(`Scope '${dto.name}' already exists`);
        }

        const scope = this.scopeRepo.create({
            name: dto.name,
            displayName: dto.displayName || dto.name,
            description: dto.description,
            claims: dto.claims || [],
            isDefault: dto.isDefault ?? false,
        });

        return this.scopeRepo.save(scope);
    }

    async remove(id: string): Promise<void> {
        const scope = await this.findById(id);
        if (!scope) {
            throw new NotFoundException(`Scope '${id}' not found`);
        }
        await this.scopeRepo.delete(id);
    }
}
