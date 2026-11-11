import { z } from "zod";
import { ROLES } from "../config/permissions";

export const updateRoleSchema = z.object({
  role: z.enum(ROLES),
});