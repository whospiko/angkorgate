import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  refreshOidcTokens,
} from "./angkorgate";

export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:4001"
).replace(/\/+$/, "");

export interface SsoUser {
  id: string;
  email: string | null;
  name: string | null;
  roles: string[];
  permissions: string[];
}

export interface TodoItem {
  id: string;
  userId: string;
  userEmail: string | null;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = getAccessToken();
  if (!token) {
    if (getRefreshToken()) {
      const refreshed = await refreshOidcTokens();
      token = refreshed.access_token;
    } else {
      throw new ApiError("Not authenticated", 401);
    }
  }

  const doRequest = (accessToken: string) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let res = await doRequest(token);

  if (res.status === 401 && getRefreshToken()) {
    try {
      const refreshed = await refreshOidcTokens();
      token = refreshed.access_token;
      res = await doRequest(token);
    } catch {
      clearTokens();
      throw new ApiError("Session expired. Please sign in again.", 401);
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
    if (res.status === 401) {
      clearTokens();
    }
    throw new ApiError(json?.error || `Request failed (${res.status})`, res.status);
  }

  return (json?.data ?? json) as T;
}

export function fetchMe(): Promise<SsoUser> {
  return apiFetch<SsoUser>("/me", { method: "GET" });
}

export function fetchTodos(): Promise<TodoItem[]> {
  return apiFetch<TodoItem[]>("/todos", { method: "GET" });
}

export function fetchAllTodos(): Promise<TodoItem[]> {
  return apiFetch<TodoItem[]>("/todos/all", { method: "GET" });
}

export function createTodo(title: string): Promise<TodoItem> {
  return apiFetch<TodoItem>("/todos", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function toggleTodo(id: string, completed: boolean): Promise<TodoItem> {
  return apiFetch<TodoItem>(`/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });
}

export function deleteTodo(id: string): Promise<void> {
  return apiFetch<void>(`/todos/${id}`, { method: "DELETE" });
}
