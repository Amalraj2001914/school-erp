import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be in YYYY-MM-DD format");

export const reportQuerySchema = z
  .object({
    from: day.optional(),
    to: day.optional(),
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, {
    message: "'from' must not be after 'to'",
  });