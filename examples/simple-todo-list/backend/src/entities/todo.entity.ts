import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "todos" })
export class Todo {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "varchar", length: 64 })
  userId: string;

  @Column({ name: "user_email", type: "varchar", length: 255, nullable: true })
  userEmail: string | null;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "boolean", default: false })
  completed: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
