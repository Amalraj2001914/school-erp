import { hash as hashPassword, verify as verifyPassword } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { users, refreshTokens } from "../db/schema";
import { AppError } from "../errors/app-error";
import { registerSchema } from "../schemas/auth.schema";
import { publicUser } from "./user.service";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getTokenExpiry,
  hashToken,
} from "../utils/jwt";

type RegisterInput = z.infer<typeof registerSchema>;

async function issueTokens(user: { id: number; role: string }) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user.id);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getTokenExpiry(refreshToken),
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({ name: input.name, email: input.email, passwordHash })
    .returning(publicUser);
  return user;
}

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));

  // Same message for unknown email and wrong password
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw new AppError(401, "Invalid email or password");
  }

  const tokens = await issueTokens(user);
  const { passwordHash, ...safeUser } = user;
  return { user: safeUser, ...tokens };
}

export async function refresh(token: string) {
  const { id } = verifyRefreshToken(token);

  // Delete-and-check in one query: each refresh token works only once (rotation)
  const [used] = await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(token)))
    .returning();
  if (!used) throw new AppError(401, "Invalid or expired token");

  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) throw new AppError(401, "Invalid or expired token");

  return issueTokens(user);
}

export async function logout(token: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hashToken(token)));
}

export async function getMe(id: number) {
  const [user] = await db.select(publicUser).from(users).where(eq(users.id, id));
  if (!user) throw new AppError(401, "Invalid or expired token");
  return user;
}