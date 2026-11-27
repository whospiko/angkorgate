import { colTimestamptz } from '../../common/utils/db-types.util';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';

export type AttributeTargetType = 'CUSTOMER' | 'EMPLOYEE_POSITION';
export type AttributeValueType = 'string' | 'number' | 'boolean' | 'array<string>' | 'object';

@Entity('attribute_schemas')
@Unique('uq_attribute_schema_target_domain_key', ['targetType', 'domain', 'key'])
@Index('idx_attr_schemas_target_domain', ['targetType', 'domain'])
export class AttributeSchema {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'target_type', type: 'varchar', length: 30 })
    targetType: AttributeTargetType;

    @Column({ type: 'varchar', length: 30 })
    domain: string; // 'PATIENT' | 'GUEST' | 'CUSTOMER' | 'CLINIC' | 'HOTEL' | 'POS' | 'GENERAL'

    @Column({ type: 'varchar', length: 100 })
    key: string;

    @Column({ name: 'value_type', type: 'varchar', length: 20 })
    valueType: AttributeValueType;

    @Column({ name: 'is_required', type: 'boolean', default: false })
    isRequired: boolean;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;
}
