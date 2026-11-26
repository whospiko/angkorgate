"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Protect, useAngkorGate, UserProfile } from "@angkorgate/nextjs";
import type { TodoRow } from "@/lib/todo-db";

export default function DashboardPage() {
  const { isLoaded, isSignedIn, getToken, refreshSession } = useAngkorGate();
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [todoScope, setTodoScope] = useState<"mine" | "all">("mine");
  const [newTitle, setNewTitle] = useState("");
  const [addingTodo, setAddingTodo] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...init.headers,
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (res.status === 204) return undefined as T;
      const json = (await res.json().catch(() => null)) as {
        data?: T;
        error?: string;
      } | null;

      if (!res.ok) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }

      return (json?.data ?? json) as T;
    },
    [getToken]
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;

    apiCall<TodoRow[]>(`/api/todos${todoScope === "all" ? "?scope=all" : ""}`)
      .then((list) => {
        if (active) setTodos(list);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load todos.");
        }
      });

    return () => {
      active = false;
    };
  }, [apiCall, isLoaded, isSignedIn, todoScope]);

  async function handleRefresh() {
    setStatusMessage(null);
    setError(null);
    const refreshed = await refreshSession();
    if (refreshed) {
      setStatusMessage(
        `OIDC tokens refreshed (expires in ${refreshed.expires_in ?? 3600}s).`
      );
    }
  }

  async function handleAddTodo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setAddingTodo(true);
    setError(null);
    try {
      const created = await apiCall<TodoRow>("/api/todos", {
        method: "POST",
        body: JSON.stringify({ title: trimmed }),
      });
      setTodos((prev) => [created, ...prev]);
      setNewTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo.");
    } finally {
      setAddingTodo(false);
    }
  }

  async function handleToggleTodo(todo: TodoRow) {
    setError(null);
    try {
      const updated = await apiCall<TodoRow>(`/api/todos/${todo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !todo.completed }),
      });
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo.");
    }
  }

  async function handleDeleteTodo(id: string) {
    setError(null);
    try {
      await apiCall<void>(`/api/todos/${id}`, { method: "DELETE" });
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete todo.");
    }
  }

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-zinc-400">Loading AngkorGate session...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-200">
            ← Home
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">
            Protected Dashboard (@angkorgate/nextjs)
          </h1>
          <p className="text-xs text-zinc-400">
            Guarded by <code>angkorgateMiddleware</code> and verified via{" "}
            <code>verifyAngkorGateRequest</code>
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleRefresh()}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
        >
          Refresh Token
        </button>
      </header>

      {statusMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {statusMessage}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <UserProfile showRoles showPermissions />

      <Protect
        anyRole={["ADMIN"]}
        anyPermission={["todos:read:all"]}
        fallback={
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-400">
            Tip: Sign in with an <code>ADMIN</code> account to unlock the{" "}
            <strong>All Users&apos; Todos</strong> view via{" "}
            <code>&lt;Protect&gt;</code>.
          </div>
        }
      >
        <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
          <span className="text-xs font-medium text-indigo-200">
            RBAC Admin Scope Unlocked (&lt;Protect&gt;)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTodoScope("mine")}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                todoScope === "mine"
                  ? "border-indigo-400 bg-indigo-600 text-white"
                  : "border-zinc-700 text-zinc-300"
              }`}
            >
              My Todos
            </button>
            <button
              type="button"
              onClick={() => setTodoScope("all")}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                todoScope === "all"
                  ? "border-indigo-400 bg-indigo-600 text-white"
                  : "border-zinc-700 text-zinc-300"
              }`}
            >
              All Users&apos; Todos (Admin)
            </button>
          </div>
        </div>
      </Protect>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Todo List (better-sqlite3 • /api/todos)
        </h2>

        <form onSubmit={handleAddTodo} className="mt-4 flex gap-2.5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a todo stored in SQLite..."
            disabled={addingTodo}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={addingTodo}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {addingTodo ? "Adding..." : "Add Todo"}
          </button>
        </form>

        {todos.length === 0 ? (
          <p className="mt-5 text-center text-xs text-zinc-500">
            No todos yet. Add one above!
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => void handleToggleTodo(todo)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 accent-indigo-500"
                  />
                  <span
                    className={
                      todo.completed
                        ? "text-zinc-500 line-through"
                        : "text-zinc-100"
                    }
                  >
                    {todo.title}
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  {todoScope === "all" && todo.userEmail && (
                    <span className="text-xs text-zinc-500">
                      {todo.userEmail}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDeleteTodo(todo.id)}
                    className="rounded px-2 py-1 text-xs text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400"
                    aria-label="Delete todo"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
