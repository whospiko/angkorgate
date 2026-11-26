import { Router, type Response } from "express";
import { AppDataSource } from "../data-source";
import { Todo } from "../entities/todo.entity";
import {
  requireAuth,
  requireRoleOrPermission,
  type AuthenticatedRequest,
} from "../middleware/angkorgate-auth";

export const todoRouter = Router();

todoRouter.use(requireAuth);

// List current user's todos
todoRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const repo = AppDataSource.getRepository(Todo);
  const todos = await repo.find({
    where: { userId: req.authUser!.id },
    order: { createdAt: "DESC" },
  });
  res.json({ data: todos });
});

// Admin / permission-gated: list all users' todos
todoRouter.get(
  "/all",
  requireRoleOrPermission({
    roles: ["ADMIN"],
    permissions: ["todos:read:all"],
  }),
  async (_req: AuthenticatedRequest, res: Response) => {
    const repo = AppDataSource.getRepository(Todo);
    const todos = await repo.find({ order: { createdAt: "DESC" } });
    res.json({ data: todos });
  }
);

// Create a todo for the authenticated SSO user
todoRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const repo = AppDataSource.getRepository(Todo);
  const todo = repo.create({
    title,
    completed: Boolean(req.body?.completed),
    userId: req.authUser!.id,
    userEmail: req.authUser!.email,
  });

  const saved = await repo.save(todo);
  res.status(201).json({ data: saved });
});

// Update a todo owned by the authenticated SSO user (or ADMIN)
todoRouter.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const repo = AppDataSource.getRepository(Todo);
  const todo = await repo.findOne({ where: { id } });

  if (!todo) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  const isAdmin = req.authUser!.roles.some((r) => r.toUpperCase() === "ADMIN");
  if (todo.userId !== req.authUser!.id && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (typeof req.body?.title === "string") {
    const trimmed = req.body.title.trim();
    if (!trimmed) {
      res.status(400).json({ error: "title cannot be empty" });
      return;
    }
    todo.title = trimmed;
  }

  if (typeof req.body?.completed === "boolean") {
    todo.completed = req.body.completed;
  }

  const updated = await repo.save(todo);
  res.json({ data: updated });
});

// Delete a todo owned by the authenticated SSO user (or ADMIN)
todoRouter.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id);
  const repo = AppDataSource.getRepository(Todo);
  const todo = await repo.findOne({ where: { id } });

  if (!todo) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  const isAdmin = req.authUser!.roles.some((r) => r.toUpperCase() === "ADMIN");
  if (todo.userId !== req.authUser!.id && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await repo.remove(todo);
  res.status(204).send();
});
