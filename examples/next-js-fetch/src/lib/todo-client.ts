import { AngkorGateError, refreshOidcTokens } from "./angkorgate";
import { clearAuthTokens, getAccessToken, getRefreshToken } from "./auth-storage";

export interface TodoItem {
  id: string;
  userId: string;
  userEmail: string | null;
  title: string;
  completed: boolean;
  createdAt: string;
}

async function todoFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = getAccessToken();
  if (!token) {
    const refreshed = await refreshOidcTokens();
    token = refreshed.access_token;
  }

  const doFetch = (accessToken: string) =>
    fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

  let res = await doFetch(token);

  if (res.status === 401 && getRefreshToken()) {
    try {
      const refreshed = await refreshOidcTokens();
      res = await doFetch(refreshed.access_token);
    } catch (err) {
      clearAuthTokens();
      throw err;
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const json = (await res.json().catch(() => null)) as {
    data?: T;
    error?: string;
  } | null;

  if (!res.ok) {
    throw new AngkorGateError(
      json?.error || `Todo API failed (${res.status})`,
      res.status,
      json
    );
  }

  return (json?.data ?? json) as T;
}

export function fetchTodos(scope: "mine" | "all" = "mine"): Promise<TodoItem[]> {
  const query = scope === "all" ? "?scope=all" : "";
  return todoFetch<TodoItem[]>(`/api/todos${query}`, { method: "GET" });
}

export function createTodoItem(title: string): Promise<TodoItem> {
  return todoFetch<TodoItem>("/api/todos", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function toggleTodoItem(id: string, completed: boolean): Promise<TodoItem> {
  return todoFetch<TodoItem>(`/api/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });
}

export function deleteTodoItem(id: string): Promise<void> {
  return todoFetch<void>(`/api/todos/${id}`, { method: "DELETE" });
}
