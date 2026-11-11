import { z } from "zod";

const email = z.string().trim().toLowerCase().email("email must be a valid email address");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(100),
  email,
  password: z.string().min(8, "password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});