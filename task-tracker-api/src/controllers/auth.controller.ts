import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { registerSchema, loginSchema, refreshSchema } from "../schemas/auth.schema";

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body ?? {});
  const user = await authService.register(input);
  res.status(201).json({ success: true, data: user });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body ?? {});
  const data = await authService.login(input.email, input.password);
  res.status(200).json({ success: true, data });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body ?? {});
  const data = await authService.refresh(refreshToken);
  res.status(200).json({ success: true, data });
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body ?? {});
  await authService.logout(refreshToken);
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const user = await authService.getMe(req.user!.id);
  res.status(200).json({ success: true, data: user });
}