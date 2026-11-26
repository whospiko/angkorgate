"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ANGKORGATE_CONSOLE_URL,
  AngkorGateError,
  buildEndSessionUrl,
  fetchUserInfo,
  refreshOidcTokens,
} from "@/lib/angkorgate";
import {
  clearAuthTokens,
  decodeJwtPayload,
  getIdToken,
} from "@/lib/auth-storage";
import {
  createTodoItem,
  deleteTodoItem,
  fetchTodos,
  toggleTodoItem,
  type TodoItem,
} from "@/lib/todo-client";
import type { OidcUserInfo } from "@/types/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<OidcUserInfo | null>(null);
  const [idClaims, setIdClaims] = useState<Record<string, unknown> | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoScope, setTodoScope] = useState<"mine" | "all">("mine");
  const [newTitle, setNewTitle] = useState("");
  const [addingTodo, setAddingTodo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"refresh" | "logout" | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (scope: "mine" | "all" = "mine") => {
    const [info, todoList] = await Promise.all([
      fetchUserInfo(),
      fetchTodos(scope),
    ]);
    const idToken = getIdToken();
    return {
      info,
      todoList,
      claims: idToken ? decodeJwtPayload(idToken) : null,
    };
  }, []);

  useEffect(() => {
    let active = true;

    loadDashboard("mine")
      .then(({ info, todoList, claims }) => {
        if (!active) return;
        setUserInfo(info);
        setTodos(todoList);
        setIdClaims(claims);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof AngkorGateError && err.status === 401) {
          clearAuthTokens();
          router.replace("/login?redirect=/dashboard");
          return;
        }
        setError(
          err instanceof AngkorGateError
            ? err.message
            : "Failed to load OIDC UserInfo from AngkorGate."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadDashboard, router]);

  async function handleRefreshToken() {
    setBusyAction("refresh");
    setStatusMessage(null);
    setError(null);
    try {
      const refreshed = await refreshOidcTokens();
      setStatusMessage(
        `OIDC tokens refreshed (expires in ${refreshed.expires_in}s).`
      );
      const { info, todoList, claims } = await loadDashboard(todoScope);
      setUserInfo(info);
      setTodos(todoList);
      setIdClaims(claims);
    } catch (err) {
      if (err instanceof AngkorGateError && err.status === 401) {
        clearAuthTokens();
        router.replace("/login?redirect=/dashboard");
        return;
      }
      setError(err instanceof Error ? err.message : "Token refresh failed.");
    } finally {
      setBusyAction(null);
    }
  }

  function handleLogout() {
    setBusyAction("logout");
    const endSessionUrl = buildEndSessionUrl();
    window.location.replace(endSessionUrl);
  }

  async function handleAddTodo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setAddingTodo(true);
    setError(null);
    try {
      const created = await createTodoItem(trimmed);
      setTodos((prev) => [created, ...prev]);
      setNewTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo.");
    } finally {
      setAddingTodo(false);
    }
  }

  async function handleToggleTodo(todo: TodoItem) {
    setError(null);
    try {
      const updated = await toggleTodoItem(todo.id, !todo.completed);
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo.");
    }
  }

  async function handleDeleteTodo(id: string) {
    setError(null);
    try {
      await deleteTodoItem(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete todo.");
    }
  }

  async function handleScopeChange(nextScope: "mine" | "all") {
    setTodoScope(nextScope);
    setError(null);
    try {
      const list = await fetchTodos(nextScope);
      setTodos(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch todos.");
    }
  }

  if (loading && !userInfo) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
        <div className="text-sm text-zinc-400">
          Verifying OIDC session with AngkorGate...
        </div>
      </main>
    );
  }

  const roles = Array.isArray(userInfo?.roles) ? userInfo.roles : [];
  const permissions = Array.isArray(userInfo?.permissions)
    ? userInfo.permissions
    : [];
  const canViewAll =
    roles.some((r) => r.toUpperCase() === "ADMIN") ||
    permissions.includes("todos:read:all");

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-200">
            ← Home
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">Protected Dashboard</h1>
          <p className="text-xs text-zinc-400">
            Guarded by <code>src/middleware.ts</code> and verified via{" "}
            <code>GET /oidc/me</code>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={`${ANGKORGATE_CONSOLE_URL}/account`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3.5 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/25"
          >
            Manage Account ↗
          </a>
          <button
            type="button"
            onClick={handleRefreshToken}
            disabled={busyAction !== null}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {busyAction === "refresh" ? "Refreshing..." : "Refresh Token"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={busyAction !== null}
            className="rounded-lg bg-red-600/90 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {busyAction === "logout" ? "Signing out..." : "Sign Out (SSO)"}
          </button>
        </div>
      </header>

      {statusMessage && (
        <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {statusMessage}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {userInfo && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              OIDC UserInfo (/oidc/me)
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Subject (sub)</dt>
                <dd className="truncate font-mono text-xs text-zinc-300">
                  {userInfo.sub}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Name</dt>
                <dd className="font-medium text-white">
                  {userInfo.name || userInfo.preferred_username || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Email</dt>
                <dd className="font-medium text-white">
                  {userInfo.email || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Email Verified</dt>
                <dd className="text-zinc-200">
                  {userInfo.email_verified ? "Yes" : "No"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Roles &amp; Permissions
            </h2>
            <div className="mt-4">
              <p className="text-xs text-zinc-400">Assigned Roles</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">No roles returned</span>
                )}
              </div>
            </div>

            {permissions.length > 0 && (
              <div className="mt-5">
                <p className="text-xs text-zinc-400">
                  Permissions ({permissions.length})
                </p>
                <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                  {permissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-300"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Todo List (better-sqlite3 • /api/todos)
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Fullstack Next.js API routes verified against AngkorGate SSO.
                </p>
              </div>

              {canViewAll && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleScopeChange("mine")}
                    className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                      todoScope === "mine"
                        ? "border-zinc-600 bg-zinc-800 text-white"
                        : "border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    My Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleScopeChange("all")}
                    className={`rounded-lg border px-3 py-1 text-xs font-medium transition ${
                      todoScope === "all"
                        ? "border-zinc-600 bg-zinc-800 text-white"
                        : "border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    All Users&apos; Todos (Admin)
                  </button>
                </div>
              )}
            </div>

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
                No todos yet. Add one above to test SQLite persistence.
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

          {idClaims && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 md:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Decoded ID Token Claims
              </h2>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
                {JSON.stringify(idClaims, null, 2)}
              </pre>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
