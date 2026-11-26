import type { AngkorGateUser } from "./types";

export function normalizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string");
}

export function hasRole(
  user: Pick<AngkorGateUser, "roles"> | null | undefined,
  role: string
): boolean {
  if (!user) return false;
  const target = role.toUpperCase();
  return user.roles.some((r) => r.toUpperCase() === target);
}

export function hasAnyRole(
  user: Pick<AngkorGateUser, "roles"> | null | undefined,
  roles: string[]
): boolean {
  return roles.some((role) => hasRole(user, role));
}

export function hasPermission(
  user: Pick<AngkorGateUser, "permissions"> | null | undefined,
  permission: string
): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: Pick<AngkorGateUser, "permissions"> | null | undefined,
  permissions: string[]
): boolean {
  return permissions.some((perm) => hasPermission(user, perm));
}
