export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Express Todo API (AngkorGate SSO)",
    version: "0.1.0",
    description:
      "Simple Todo API built with Express, TypeORM, and better-sqlite3, protected by AngkorGate SSO (/oidc/me or /auth/me). Click **Authorize** and enter a Bearer token from AngkorGate to test protected endpoints.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste your AngkorGate access token (from OIDC SSO or /auth/login)",
      },
    },
    schemas: {
      Todo: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string" },
          userEmail: { type: "string", nullable: true },
          title: { type: "string" },
          completed: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateTodoBody: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", example: "Buy coffee" },
          completed: { type: "boolean", example: false },
        },
      },
      UpdateTodoBody: {
        type: "object",
        properties: {
          title: { type: "string", example: "Buy espresso" },
          completed: { type: "boolean", example: true },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: {
          "200": { description: "API and SQLite status" },
        },
      },
    },
    "/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current AngkorGate SSO user info, roles & permissions",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Authenticated SSO user" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/todos": {
      get: {
        tags: ["Todos"],
        summary: "List current user's todos",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "List of user todos" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Todos"],
        summary: "Create a new todo",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTodoBody" },
            },
          },
        },
        responses: {
          "201": { description: "Todo created" },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/todos/all": {
      get: {
        tags: ["Todos"],
        summary: "List all users' todos (requires ADMIN role or todos:read:all permission)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "All todos" },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden" },
        },
      },
    },
    "/todos/{id}": {
      patch: {
        tags: ["Todos"],
        summary: "Update a todo",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTodoBody" },
            },
          },
        },
        responses: {
          "200": { description: "Todo updated" },
          "403": { description: "Forbidden" },
          "404": { description: "Todo not found" },
        },
      },
      delete: {
        tags: ["Todos"],
        summary: "Delete a todo",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "204": { description: "Todo deleted" },
          "403": { description: "Forbidden" },
          "404": { description: "Todo not found" },
        },
      },
    },
  },
};
