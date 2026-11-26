import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ANGKORGATE_CONSOLE_URL,
  clearTokens,
  exchangeCodeForTokens,
  getAccessToken,
  logoutSso,
  startSsoLogin,
} from "./lib/angkorgate";
import {
  ApiError,
  createTodo,
  deleteTodo,
  fetchAllTodos,
  fetchMe,
  fetchTodos,
  toggleTodo,
  type SsoUser,
  type TodoItem,
} from "./lib/todo-api";

export function App() {
  const [user, setUser] = useState<SsoUser | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [viewMode, setViewMode] = useState<"mine" | "all">("mine");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackHandled = useRef(false);

  const canViewAll = Boolean(
    user &&
      (user.roles.some((r) => r.toUpperCase() === "ADMIN") ||
        user.permissions.includes("todos:read:all"))
  );

  const loadWorkspace = useCallback(async (mode: "mine" | "all" = "mine") => {
    const me = await fetchMe();
    setUser(me);
    const list = mode === "all" ? await fetchAllTodos() : await fetchTodos();
    setTodos(list);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oidcError = url.searchParams.get("error");

    if (oidcError) {
      setError(url.searchParams.get("error_description") || oidcError);
      window.history.replaceState({}, "", "/");
      setLoading(false);
      return;
    }

    if (code && !callbackHandled.current) {
      callbackHandled.current = true;
      exchangeCodeForTokens(code, state)
        .then(() => {
          window.history.replaceState({}, "", "/");
          return loadWorkspace("mine");
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "SSO login failed.");
        })
        .finally(() => setLoading(false));
      return;
    }

    if (!getAccessToken()) {
      setLoading(false);
      return;
    }

    loadWorkspace("mine")
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          setUser(null);
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to load Express Todo API."
        );
      })
      .finally(() => setLoading(false));
  }, [loadWorkspace]);

  async function handleAddTodo(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createTodo(trimmed);
      setTodos((prev) => [created, ...prev]);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(todo: TodoItem) {
    setError(null);
    try {
      const updated = await toggleTodo(todo.id, !todo.completed);
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo.");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete todo.");
    }
  }

  async function handleSwitchView(mode: "mine" | "all") {
    setViewMode(mode);
    setError(null);
    try {
      const list = mode === "all" ? await fetchAllTodos() : await fetchTodos();
      setTodos(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch todos.");
    }
  }

  if (loading) {
    return (
      <main className="page center">
        <p className="muted">Connecting to AngkorGate SSO...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page center">
        <section className="card auth-card">
          <span className="badge">React + Express + TypeORM + SQLite</span>
          <h1>Simple Todo List</h1>
          <p className="muted">
            Sign in with AngkorGate SSO. Your React frontend fetches an OIDC
            token and sends it to the Express + TypeORM API.
          </p>
          {error && <div className="alert">{error}</div>}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void startSsoLogin()}
          >
            Sign In with AngkorGate SSO
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <h1>Simple Todo List</h1>
          <p className="muted">
            Signed in as <strong>{user.email || user.name || user.id}</strong>
            {user.roles.map((role) => (
              <span key={role} className="role-pill">
                {role}
              </span>
            ))}
          </p>
        </div>

        <div className="actions">
          <a
            href={`${ANGKORGATE_CONSOLE_URL}/account`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Manage Account ↗
          </a>
          <button type="button" className="btn btn-danger" onClick={logoutSso}>
            Sign Out
          </button>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <section className="card">
        <form onSubmit={handleAddTodo} className="todo-form">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            disabled={submitting}
          />
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Adding..." : "Add Todo"}
          </button>
        </form>

        {canViewAll && (
          <div className="tabs">
            <button
              type="button"
              className={`tab ${viewMode === "mine" ? "active" : ""}`}
              onClick={() => void handleSwitchView("mine")}
            >
              My Todos
            </button>
            <button
              type="button"
              className={`tab ${viewMode === "all" ? "active" : ""}`}
              onClick={() => void handleSwitchView("all")}
            >
              All Users&apos; Todos (Admin)
            </button>
          </div>
        )}

        {todos.length === 0 ? (
          <p className="empty">No todos yet. Add one above!</p>
        ) : (
          <ul className="todo-list">
            {todos.map((todo) => (
              <li key={todo.id} className="todo-item">
                <label className="todo-label">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => void handleToggle(todo)}
                  />
                  <span className={todo.completed ? "done" : ""}>
                    {todo.title}
                  </span>
                </label>
                <div className="todo-meta">
                  {viewMode === "all" && todo.userEmail && (
                    <span className="owner">{todo.userEmail}</span>
                  )}
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => void handleDelete(todo.id)}
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

export default App;
