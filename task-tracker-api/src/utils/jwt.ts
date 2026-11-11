import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { createHash, randomUUID } from "crypto";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";

export function signAccessToken(user: { id: number; role: string }) {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: String(user.id),
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function signRefreshToken(userId: number) {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: String(userId),
    jwtid: randomUUID(), // makes every refresh token unique
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string) {
  try {
    const p = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
    return { id: Number(p.sub), role: String(p.role) };
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
}

export function verifyRefreshToken(token: string) {
  try {
    const p = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
    return { id: Number(p.sub) };
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
}

export function getTokenExpiry(token: string): Date {
  const decoded = jwt.decode(token) as JwtPayload;
  return new Date((decoded.exp as number) * 1000);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}