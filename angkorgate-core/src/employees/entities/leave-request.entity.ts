import { colTimestamptz } from '../../common/utils/db-types.util';
import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity';
import { User } from '../../users/entities/user.entity';

export type LeaveType = 'ANNUAL' | 'SICK' | 'UNPAID' | 'MATERNITY' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

@Entity('leave_requests')
@Check(`"start_date" <= "end_date"`)
@Index('idx_leave_requests_emp', ['employeeId'])
@Index('idx_leave_requests_status', ['status'])
export class LeaveRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'employee_id', type: 'uuid' })
    employeeId: string;

    @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employee_id' })
    employee: Employee;

    @Column({ name: 'leave_type', type: 'varchar', length: 20 })
    leaveType: LeaveType;

    @Column({ name: 'start_date', type: 'date' })
    startDate: string;

    @Column({ name: 'end_date', type: 'date' })
    endDate: string;

    @Column({ type: 'text', nullable: true })
    reason: string | null;

    @Column({ type: 'varchar', length: 20, default: 'PENDING' })
    status: LeaveStatus;

    @Column({ name: 'reviewed_by_id', type: 'uuid', nullable: true })
    reviewedById: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'reviewed_by_id' })
    reviewedBy: User | null;

    @Column({ name: 'reviewed_at', type: colTimestamptz(), nullable: true })
    reviewedAt: Date | null;

    @Column({ name: 'review_note', type: 'text', nullable: true })
    reviewNote: string | null;

    @Column({ name: 'attachment_name', type: 'varchar', length: 255, nullable: true })
    attachmentName: string | null;

    @Column({ name: 'attachment_mime_type', type: 'varchar', length: 100, nullable: true })
    attachmentMimeType: string | null;

    @Column({ name: 'attachment_data_url', type: 'text', nullable: true })
    attachmentDataUrl: string | null;

    @CreateDateColumn({ name: 'created_at', type: colTimestamptz() })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: colTimestamptz() })
    updatedAt: Date;
}
