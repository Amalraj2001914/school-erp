import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";

function getPgCode(err: unknown): string | undefined {
  const e = err as { code?: unknown; cause?: { code?: unknown } };
  const code = e?.code ?? e?.cause?.code;
  return typeof code === "string" ? code : undefined;
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  // 1. Validation errors from Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  // 2. Errors we throw on purpose (404, 400, ...)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // 3. Malformed JSON body (from express.json())
  if (typeof err === "object" && err !== null && (err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ success: false, message: "Invalid JSON in request body" });
    return;
  }

  // 4. PostgreSQL errors
  const pgCode = getPgCode(err);
  if (pgCode === "23505") {
    res.status(409).json({ success: false, message: "Record already exists" });
    return;
  }

  // 5. Anything unexpected: log details, hide them from the client
  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
}