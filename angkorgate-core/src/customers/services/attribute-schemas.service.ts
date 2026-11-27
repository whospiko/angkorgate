import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    AttributeSchema,
    AttributeTargetType,
    AttributeValueType,
} from '../entities/attribute-schema.entity';
import { UpsertAttributeSchemaDto } from '../dto/upsert-attribute-schema.dto';
import { ATTRIBUTE_SCHEMAS } from '../seed/attribute-schemas';
import { AuditService } from '../../audit/services/audit.service';

const DEFAULT_POSITION_SCHEMAS: Record<string, Record<string, AttributeValueType>> = {
    CLINIC: {
        license_number: 'string',
        consultation_fee: 'number',
    },
    HOTEL: {
        languages: 'array<string>',
        shift_lead: 'boolean',
    },
    POS: {
        pos_terminal_id: 'string',
        drawer_code: 'string',
    },
};

@Injectable()
export class AttributeSchemasService {
    constructor(
        @InjectRepository(AttributeSchema)
        private readonly repo: Repository<AttributeSchema>,
        private readonly audit: AuditService,
    ) { }

    list(targetType?: AttributeTargetType, domain?: string): Promise<AttributeSchema[]> {
        const where: Partial<Pick<AttributeSchema, 'targetType' | 'domain'>> = {};
        if (targetType) where.targetType = targetType;
        if (domain) where.domain = domain.toUpperCase();
        return this.repo.find({ where, order: { targetType: 'ASC', domain: 'ASC', key: 'ASC' } });
    }

    async upsert(dto: UpsertAttributeSchemaDto, actorId?: string): Promise<AttributeSchema> {
        const domain = dto.domain.trim().toUpperCase();
        const key = dto.key.trim();

        let schema = await this.repo.findOne({
            where: { targetType: dto.targetType, domain, key },
        });
        if (schema) {
            schema.valueType = dto.valueType;
            schema.isRequired = dto.isRequired ?? schema.isRequired;
            schema.description = dto.description ?? schema.description;
        } else {
            schema = this.repo.create({
                targetType: dto.targetType,
                domain,
                key,
                valueType: dto.valueType,
                isRequired: dto.isRequired ?? false,
                description: dto.description ?? null,
            });
        }

        const saved = await this.repo.save(schema);
        void this.audit.log({
            actorId: actorId ?? null,
            action: 'attribute_schema.upsert',
            entity: 'attribute_schema',
            entityId: saved.id,
            newValue: {
                targetType: saved.targetType,
                domain: saved.domain,
                key: saved.key,
                valueType: saved.valueType,
            },
        });
        return saved;
    }

    async remove(id: string, actorId?: string): Promise<void> {
        const existing = await this.repo.findOne({ where: { id } });
        if (!existing) throw new NotFoundException(`Attribute schema ${id} not found`);
        await this.repo.delete(id);

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'attribute_schema.delete',
            entity: 'attribute_schema',
            entityId: id,
            oldValue: { targetType: existing.targetType, domain: existing.domain, key: existing.key },
        });
    }

    async seedDefaults(actorId?: string): Promise<{ created: number }> {
        let created = 0;

        for (const [domain, fields] of Object.entries(ATTRIBUTE_SCHEMAS)) {
            for (const [key, valueType] of Object.entries(fields)) {
                const exists = await this.repo.findOne({
                    where: { targetType: 'CUSTOMER', domain, key },
                });
                if (!exists) {
                    await this.repo.save(
                        this.repo.create({
                            targetType: 'CUSTOMER',
                            domain,
                            key,
                            valueType: valueType as AttributeValueType,
                        }),
                    );
                    created++;
                }
            }
        }

        for (const [domain, fields] of Object.entries(DEFAULT_POSITION_SCHEMAS)) {
            for (const [key, valueType] of Object.entries(fields)) {
                const exists = await this.repo.findOne({
                    where: { targetType: 'EMPLOYEE_POSITION', domain, key },
                });
                if (!exists) {
                    await this.repo.save(
                        this.repo.create({
                            targetType: 'EMPLOYEE_POSITION',
                            domain,
                            key,
                            valueType,
                        }),
                    );
                    created++;
                }
            }
        }

        void this.audit.log({
            actorId: actorId ?? null,
            action: 'attribute_schema.seed',
            entity: 'attribute_schema',
            entityId: 'defaults',
            newValue: { created },
        });

        return { created };
    }

    async validateValue(
        targetType: AttributeTargetType,
        domain: string,
        key: string,
        value: unknown,
    ): Promise<void> {
        const schema = await this.repo.findOne({
            where: { targetType, domain: domain.toUpperCase(), key },
        });
        if (!schema) return;

        if (!this.matchesType(schema.valueType, value)) {
            throw new BadRequestException(
                `Attribute '${key}' for ${targetType}/${domain} expects type '${schema.valueType}'`,
            );
        }
    }

    private matchesType(expected: AttributeValueType, value: unknown): boolean {
        switch (expected) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && Number.isFinite(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'array<string>':
                return Array.isArray(value) && value.every((item) => typeof item === 'string');
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            default:
                return true;
        }
    }
}
