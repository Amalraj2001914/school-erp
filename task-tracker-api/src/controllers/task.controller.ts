import { Request, Response } from "express";
import * as taskService from "../services/task.service";
import { AppError } from "../errors/app-error";
import {
  createTaskSchema,
  bulkCreateTaskSchema,
  updateTaskSchema,
  listQuerySchema,
  idSchema,
} from "../schemas/task.schema";

function getId(req: Request): number {
  const result = idSchema.safeParse(req.params.id);
  if (!result.success) {
    throw new AppError(400, "id must be a positive integer");
  }
  return result.data;
}

// GET /api/tasks?status=done
export async function listTasks(req: Request, res: Response) {
  const { status } = listQuerySchema.parse(req.query);
  const data = await taskService.getAllTasks(req.user!, status);
  res.status(200).json({ success: true, data });
}

// GET /api/tasks/:id
export async function getTask(req: Request, res: Response) {
  const task = await taskService.getTaskById(req.user!, getId(req));
  if (!task) throw new AppError(404, "Task not found");
  res.status(200).json({ success: true, data: task });
}

// POST /api/tasks
export async function createTask(req: Request, res: Response) {
  const input = createTaskSchema.parse(req.body ?? {});
  const task = await taskService.createTask(req.user!, input);
  res.status(201).json({ success: true, data: task });
}

// POST /api/tasks/bulk
export async function createTasksBulk(req: Request, res: Response) {
  const { studentIds, allStudents, ...fields } = bulkCreateTaskSchema.parse(req.body ?? {});
  const data = await taskService.createTasksBulk(
    req.user!,
    fields,
    allStudents ? { all: true } : { studentIds: studentIds! }
  );
  res.status(201).json({ success: true, count: data.length, data });
}

// PUT /api/tasks/:id
export async function updateTask(req: Request, res: Response) {
  const id = getId(req);
  const input = updateTaskSchema.parse(req.body ?? {});
  const task = await taskService.updateTask(req.user!, id, input);
  if (!task) throw new AppError(404, "Task not found");
  res.status(200).json({ success: true, data: task });
}

// DELETE /api/tasks/:id
export async function deleteTask(req: Request, res: Response) {
  const task = await taskService.deleteTask(req.user!, getId(req));
  if (!task) throw new AppError(404, "Task not found");
  res.status(204).send();
}