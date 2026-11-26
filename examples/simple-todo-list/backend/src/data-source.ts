import { DataSource } from "typeorm";
import { Todo } from "./entities/todo.entity";

export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: process.env.SQLITE_DB_PATH || "todo.sqlite",
  synchronize: true,
  logging: false,
  entities: [Todo],
});
