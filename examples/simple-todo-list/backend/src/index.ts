import "reflect-metadata";
import "dotenv/config";
import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { AppDataSource } from "./data-source";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "./middleware/angkorgate-auth";
import { todoRouter } from "./routes/todo.routes";
import { openApiSpec } from "./swagger";

async function bootstrap() {
  await AppDataSource.initialize();

  const app = express();
  const port = Number(process.env.PORT || 4001);
  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3001";

  app.use(
    cors({
      origin: corsOrigin.split(",").map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", database: "better-sqlite3" });
  });

  app.get("/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });

  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      swaggerOptions: { persistAuthorization: true },
    })
  );

  app.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ data: req.authUser });
  });

  app.use("/todos", todoRouter);

  app.listen(port, () => {
    console.log(`Express Todo API listening on http://localhost:${port}`);
    console.log(`Swagger UI available at http://localhost:${port}/docs`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start Express Todo API:", err);
  process.exit(1);
});
