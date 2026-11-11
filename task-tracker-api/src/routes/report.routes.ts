import { Router } from "express";
import { getSummary } from "../controllers/report.controller";
import { requirePermission } from "../middleware/authorize";

const router = Router();

router.get("/summary", requirePermission("reports:read"), getSummary);

export default router;