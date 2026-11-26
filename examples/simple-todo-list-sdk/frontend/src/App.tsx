import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Protect,
  SignedIn,
  SignedOut,
  SignInButton,
  useAngkorGate,
  UserProfile,
} from "@angkorgate/react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:4001"
).replace(/\/+$/, "");

interface TodoItem {
  id: string;
  userId: string;
  userEmail: string | null;
  title: string;
  completed: boolean;
  createdAt: string;
}

export function App() {
  const { isLoaded, isSignedIn, getToken } = useAngkorGate();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [viewMode, setViewMode] = useState<"mine" | "all">("mine");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...init.headers,
          Authorization: `Bearer ${token}`,
        },
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

    apiCall<TodoItem[]>(viewMode === "all" ? "/todos/all" : "/todos")
      .then((list) => {
        if (active) setTodos(list);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load Express Todo API."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [apiCall, isLoaded, isSignedIn, viewMode]);

  async function handleAddTodo(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiCall<TodoItem>("/todos", {
        method: "POST",
        body: JSON.stringify({ title: trimmed }),
      });
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
      const updated = await apiCall<TodoItem>(`/todos/${todo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !todo.completed }),
      });
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo.");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await apiCall<void>(`/todos/${id}`, { method: "DELETE" });
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete todo.");
    }
  }

  if (!isLoaded) {
    return (
      <main className="page center">
        <p className="muted">Connecting to AngkorGate SSO...</p>
      </main>
    );
  }

  return (
    <>
      <SignedOut>
        <main className="page center">
          <section className="card auth-card">
            <span className="badge">@angkorgate/react + @angkorgate/sdk</span>
            <h1>Simple Todo List (SDK)</h1>
            <p className="muted">
              Zero raw OIDC boilerplate. Sign in with AngkorGate SSO and manage
              your todos via the Express + TypeORM API.
            </p>
            <SignInButton className="btn btn-primary" />
          </section>
        </main>
      </SignedOut>

      <SignedIn>
        <main className="page">
          <UserProfile showRoles showPermissions />

          {error && <div className="alert">{error}</div>}

          <section className="card" style={{ marginTop: 20 }}>
            <form onSubmit={handleAddTodo} className="todo-form">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                disabled={submitting}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? "Adding..." : "Add Todo"}
              </button>
            </form>

            <Protect
              anyRole={["ADMIN"]}
              anyPermission={["todos:read:all"]}
              fallback={null}
            >
              <div className="tabs">
                <button
                  type="button"
                  className={`tab ${viewMode === "mine" ? "active" : ""}`}
                  onClick={() => setViewMode("mine")}
                >
                  My Todos
                </button>
                <button
                  type="button"
                  className={`tab ${viewMode === "all" ? "active" : ""}`}
                  onClick={() => setViewMode("all")}
                >
                  All Users&apos; Todos (Admin)
                </button>
              </div>
            </Protect>

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
      </SignedIn>
    </>
  );
}

export default App;
