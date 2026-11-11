import { Request, Response } from "express";
import * as reportService from "../services/report.service";
import { reportQuerySchema } from "../schemas/report.schema";

// GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getSummary(req: Request, res: Response) {
  const range = reportQuerySchema.parse(req.query);
  const data = await reportService.getReport(range);
  res.status(200).json({ success: true, data });
}