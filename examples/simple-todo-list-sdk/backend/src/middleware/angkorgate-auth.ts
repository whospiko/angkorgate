import { angkorgateAuth, requireRoleOrPermission } from "@angkorgate/express";

export const requireAuth = angkorgateAuth({
  baseUrl: process.env.ANGKORGATE_URL || "http://localhost:8080",
});

export { requireRoleOrPermission };
