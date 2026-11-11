import { Router } from "express";
import { listUsers, listStudents, changeRole } from "../controllers/user.controller";
import { requirePermission } from "../middleware/authorize";

const router = Router();

router.get("/students", requirePermission("students:read"), listStudents);
router.get("/", requirePermission("users:read"), listUsers);
router.patch("/:id/role", requirePermission("users:manage"), changeRole);

export default router;