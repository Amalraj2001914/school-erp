import { Request, Response } from "express";
import * as userService from "../services/user.service";
import { AppError } from "../errors/app-error";
import { idSchema } from "../schemas/task.schema";
import { updateRoleSchema } from "../schemas/user.schema";

// GET /api/users
export async function listUsers(req: Request, res: Response) {
  const data = await userService.listUsers();
  res.status(200).json({ success: true, data });
}

// PATCH /api/users/:id/role
export async function changeRole(req: Request, res: Response) {
  const idResult = idSchema.safeParse(req.params.id);
  if (!idResult.success) throw new AppError(400, "id must be a positive integer");
  const id = idResult.data;

  const { role } = updateRoleSchema.parse(req.body ?? {});

  // Prevents an admin from locking themselves out
  if (id === req.user!.id) {
    throw new AppError(400, "You cannot change your own role");
  }

  const user = await userService.updateUserRole(id, role);
  if (!user) throw new AppError(404, "User not found");
  res.status(200).json({ success: true, data: user });
}
// GET /api/users/students
export async function listStudents(req: Request, res: Response) {
  const data = await userService.listStudents();
  res.status(200).json({ success: true, data });
}