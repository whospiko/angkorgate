export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Express Todo API (@angkorgate/sdk)",
    version: "0.1.0",
    description:
      "Simple Todo API built with Express, TypeORM, better-sqlite3, and @angkorgate/sdk.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: { "200": { description: "OK" } },
      },
    },
    "/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current AngkorGate SSO user info, roles & permissions",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" } },
      },
    },
    "/todos": {
      get: {
        tags: ["Todos"],
        summary: "List current user's todos",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" } },
      },
      post: {
        tags: ["Todos"],
        summary: "Create a todo",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: { title: { type: "string" } },
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/todos/all": {
      get: {
        tags: ["Todos"],
        summary: "List all users' todos (ADMIN or todos:read:all)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "OK" }, "403": { description: "Forbidden" } },
      },
    },
    "/todos/{id}": {
      patch: {
        tags: ["Todos"],
        summary: "Update a todo",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
      delete: {
        tags: ["Todos"],
        summary: "Delete a todo",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" } },
      },
    },
  },
};
