import { NextResponse, type NextRequest } from "next/server";
import { verifyRequestAuth } from "@/lib/server-auth";
import { deleteTodo, findTodoById, updateTodo } from "@/lib/todo-db";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await verifyRequestAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = findTodoById(id);
  if (!existing) {
    return NextResponse.json({ error: "Todo not found" }, { status: 404 });
  }

  const isAdmin = user.roles.some((r) => r.toUpperCase() === "ADMIN");
  if (existing.userId !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    completed?: unknown;
  } | null;

  const updates: { title?: string; completed?: boolean } = {};
  if (typeof body?.title === "string") {
    const trimmed = body.title.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "title cannot be empty" },
        { status: 400 }
      );
    }
    updates.title = trimmed;
  }

  if (typeof body?.completed === "boolean") {
    updates.completed = body.completed;
  }

  const updated = updateTodo(id, updates);
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await verifyRequestAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = findTodoById(id);
  if (!existing) {
    return NextResponse.json({ error: "Todo not found" }, { status: 404 });
  }

  const isAdmin = user.roles.some((r) => r.toUpperCase() === "ADMIN");
  if (existing.userId !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  deleteTodo(id);
  return new NextResponse(null, { status: 204 });
}
