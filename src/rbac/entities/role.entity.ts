import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RolePermission } from "./role-permission.entity";
import { UserRole } from "./user-role.entity";

@Entity("roles")
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    code: string

    @Column({
        type: "varchar",
        length: 100
    })
    name: string

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ name: 'is_system', type: 'boolean', default: false })
    isSystem: boolean;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @OneToMany(() => RolePermission, (rp) => rp.role)
    rolePermissions: RolePermission[];

    @OneToMany(() => UserRole, (ur) => ur.role)
    userRoles: UserRole[];
}