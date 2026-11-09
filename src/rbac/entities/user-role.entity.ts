import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Role } from "./role.entity";

@Entity('user_roles')
export class UserRole {
    @PrimaryColumn({ name: 'user_id', type: 'uuid' })
    userId: string;

    @PrimaryColumn({ name: 'role_id', type: 'uuid' })
    roleId: string;

    @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
    assignedAt: Date;

    @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
    assignedBy: string | null;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Role, (r) => r.userRoles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
    role: Role;
}