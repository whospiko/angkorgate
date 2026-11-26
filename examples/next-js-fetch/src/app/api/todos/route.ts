import { NextResponse, type NextRequest } from "next/server";
import { verifyRequestAuth } from "@/lib/server-auth";
import { createTodo, listAllTodos, listTodosByUser } from "@/lib/todo-db";

export async function GET(request: NextRequest) {
  const user = await verifyRequestAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = request.nextUrl.searchParams.get("scope");
  if (scope === "all") {
    const canViewAll =
      user.roles.some((r) => r.toUpperCase() === "ADMIN") ||
      user.permissions.includes("todos:read:all");
    if (!canViewAll) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ data: listAllTodos() });
  }

  return NextResponse.json({ data: listTodosByUser(user.id) });
}

export async function POST(request: NextRequest) {
  const user = await verifyRequestAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
  } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const todo = createTodo({
    userId: user.id,
    userEmail: user.email,
    title,
  });

  return NextResponse.json({ data: todo }, { status: 201 });
}
