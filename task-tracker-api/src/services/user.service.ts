import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import type { Role } from "../config/permissions";

// Columns that are safe to return to clients (no password hash)
export const publicUser = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
};

export async function listUsers() {
  return db.select(publicUser).from(users).orderBy(asc(users.id));
}

export async function updateUserRole(id: number, role: Role) {
  const [user] = await db.update(users).set({ role }).where(eq(users.id, id)).returning(publicUser);
  return user ?? null;
}
export async function listStudents() {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.role, "student"))
    .orderBy(asc(users.name));
}