import { hasRole } from "@angkorgate/express";
import { Router, type Request, type Response } from "express";
import { AppDataSource } from "../data-source";
import { Todo } from "../entities/todo.entity";
import {
  requireAuth,
  requireRoleOrPermission,
} from "../middleware/angkorgate-auth";

export const todoRouter = Router();

todoRouter.use(requireAuth);

todoRouter.get("/", async (req: Request, res: Response) => {
  const repo = AppDataSource.getRepository(Todo);
  const todos = await repo.find({
    where: { userId: req.authUser!.id },
    order: { createdAt: "DESC" },
  });
  res.json({ data: todos });
});

todoRouter.get(
  "/all",
  requireRoleOrPermission({
    roles: ["ADMIN"],
    permissions: ["todos:read:all"],
  }),
  async (_req: Request, res: Response) => {
    const repo = AppDataSource.getRepository(Todo);
    const todos = await repo.find({ order: { createdAt: "DESC" } });
    res.json({ data: todos });
  }
);

todoRouter.post("/", async (req: Request, res: Response) => {
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

todoRouter.patch("/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const repo = AppDataSource.getRepository(Todo);
  const todo = await repo.findOne({ where: { id } });

  if (!todo) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  if (todo.userId !== req.authUser!.id && !hasRole(req.authUser, "ADMIN")) {
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

todoRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const repo = AppDataSource.getRepository(Todo);
  const todo = await repo.findOne({ where: { id } });

  if (!todo) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  if (todo.userId !== req.authUser!.id && !hasRole(req.authUser, "ADMIN")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await repo.remove(todo);
  res.status(204).send();
});
