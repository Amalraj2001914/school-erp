import { Router } from "express";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/task.controller";
import { requirePermission } from "../middleware/authorize";

const router = Router();

router.get("/", requirePermission("tasks:read"), listTasks);
router.get("/:id", requirePermission("tasks:read"), getTask);
router.post("/", requirePermission("tasks:create"), createTask);
router.put("/:id", requirePermission("tasks:update"), updateTask);
router.delete("/:id", requirePermission("tasks:delete"), deleteTask);

export default router;