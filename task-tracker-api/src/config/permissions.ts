export const ROLES = ["admin", "teacher", "student"] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "tasks:read"
  | "tasks:create"
  | "tasks:update"
  | "tasks:delete"
  | "users:read"
  | "users:manage"
  | "students:read"
  | "reports:read";

export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "tasks:delete",
    "users:read",
    "users:manage",
    "students:read",
    "reports:read",
  ],
  teacher: ["tasks:read", "tasks:create", "tasks:update", "students:read"],
  student: ["tasks:read"],
};

export function hasPermission(role: string, permission: Permission): boolean {
  return (rolePermissions[role as Role] ?? []).includes(permission);
}