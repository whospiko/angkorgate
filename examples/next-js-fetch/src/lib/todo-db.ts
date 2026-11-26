import Database from "better-sqlite3";
import crypto from "node:crypto";
import path from "node:path";

export interface TodoRow {
  id: string;
  userId: string;
  userEmail: string | null;
  title: string;
  completed: boolean;
  createdAt: string;
}

interface RawTodoRow {
  id: string;
  user_id: string;
  user_email: string | null;
  title: string;
  completed: number;
  created_at: string;
}

const globalForDb = globalThis as unknown as {
  __nextFetchTodoDb?: Database.Database;
};

function getDb(): Database.Database {
  if (!globalForDb.__nextFetchTodoDb) {
    const dbPath =
      process.env.SQLITE_DB_PATH || path.join(process.cwd(), "todo.sqlite");
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_email TEXT,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);
    globalForDb.__nextFetchTodoDb = db;
  }
  return globalForDb.__nextFetchTodoDb;
}

function mapRow(row: RawTodoRow): TodoRow {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    title: row.title,
    completed: Boolean(row.completed),
    createdAt: row.created_at,
  };
}

export function listTodosByUser(userId: string): TodoRow[] {
  const rows = getDb()
    .prepare(
      "SELECT id, user_id, user_email, title, completed, created_at FROM todos WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(userId) as RawTodoRow[];
  return rows.map(mapRow);
}

export function listAllTodos(): TodoRow[] {
  const rows = getDb()
    .prepare(
      "SELECT id, user_id, user_email, title, completed, created_at FROM todos ORDER BY created_at DESC"
    )
    .all() as RawTodoRow[];
  return rows.map(mapRow);
}

export function findTodoById(id: string): TodoRow | null {
  const row = getDb()
    .prepare(
      "SELECT id, user_id, user_email, title, completed, created_at FROM todos WHERE id = ?"
    )
    .get(id) as RawTodoRow | undefined;
  return row ? mapRow(row) : null;
}

export function createTodo(params: {
  userId: string;
  userEmail: string | null;
  title: string;
}): TodoRow {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO todos (id, user_id, user_email, title, completed, created_at) VALUES (?, ?, ?, ?, 0, ?)"
    )
    .run(id, params.userId, params.userEmail, params.title, createdAt);

  return {
    id,
    userId: params.userId,
    userEmail: params.userEmail,
    title: params.title,
    completed: false,
    createdAt,
  };
}

export function updateTodo(
  id: string,
  updates: { title?: string; completed?: boolean }
): TodoRow | null {
  const existing = findTodoById(id);
  if (!existing) return null;

  const nextTitle = updates.title ?? existing.title;
  const nextCompleted =
    updates.completed !== undefined ? updates.completed : existing.completed;

  getDb()
    .prepare("UPDATE todos SET title = ?, completed = ? WHERE id = ?")
    .run(nextTitle, nextCompleted ? 1 : 0, id);

  return {
    ...existing,
    title: nextTitle,
    completed: nextCompleted,
  };
}

export function deleteTodo(id: string): boolean {
  const info = getDb().prepare("DELETE FROM todos WHERE id = ?").run(id);
  return info.changes > 0;
}
