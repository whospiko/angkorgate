import { colTimestamptz } from '../../common/utils/db-types.util';
import {
    Column,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('runtime_settings')
export class RuntimeSetting {
    @PrimaryColumn({ type: 'varchar', length: 128 })
    key: string;

    @Column({ type: 'text', nullable: true })
    value: string | null;

    @Column({ type: 'varchar', length: 32 })
    category: string;

    @Column({ name: 'is_secret', type: 'boolean', default: false })
    isSecret: boolean;

    @Column({ name: 'updated_by', type: 'uuid', nullable: true })
    updatedBy: string | null;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;
}
