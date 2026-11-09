import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Permission } from "./permission.entity";

export type OverrideEffect = 'GRANT' | 'REVOKE';

@Entity('user_permission_overrides')
export class UserPermissionOverride {
    @PrimaryColumn({ name: 'user_id', type: 'uuid' })
    userId: string;

    @PrimaryColumn({ name: 'permission_id', type: 'uuid' })
    permissionId: string;

    @Column({ type: 'varchar', length: 10 })
    effect: OverrideEffect;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Permission, (p) => p.overrides, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'permission_id' })
    permission: Permission;
}