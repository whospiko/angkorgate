import { colTimestamptz } from '../../common/utils/db-types.util';
import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export type QuotaLeaveType = 'ANNUAL' | 'SICK' | 'MATERNITY';

@Entity('leave_policies')
export class LeavePolicy {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'leave_type', type: 'varchar', length: 20, unique: true })
    leaveType: QuotaLeaveType;

    @Column({ name: 'annual_quota_days', type: 'int' })
    annualQuotaDays: number;

    @Column({ name: 'enforce_quota', type: 'boolean', default: true })
    enforceQuota: boolean;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;
}
