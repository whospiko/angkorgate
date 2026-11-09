import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { RolePermission } from "./role-permission.entity";
import { UserPermissionOverride } from "./user-permission-override.entity";

@Entity('permissions')
@Unique(['resource', 'action'])
export class Permission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    code: string; // 'patient:read'

    @Column({ type: 'varchar', length: 50 })
    resource: string; // 'patient'

    @Column({ type: 'varchar', length: 50 })
    action: string; // 'read' | 'write' | 'delete'

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @OneToMany(() => RolePermission, (rp) => rp.permission)
    rolePermissions: RolePermission[];

    @OneToMany(() => UserPermissionOverride, (o) => o.permission)
    overrides: UserPermissionOverride[];
}