import { z } from "zod";

const statusEnum = z.enum(["pending", "done"]);
const priorityEnum = z.enum(["low", "medium", "high"]);

// YYYY-MM-DD and a real calendar date
const dateString = z.string().refine(
  (v) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v,
  "dueDate must be a valid date in YYYY-MM-DD format"
);

// id of a student a task is assigned to
const studentId = z.number().int().positive();

// Fields shared by single and bulk creation
const taskFields = {
  title: z.string().trim().min(1, "title is required").max(100, "title must be at most 100 characters"),
  description: z.string().max(1000, "description must be at most 1000 characters").optional(),
  priority: priorityEnum.optional(),
  dueDate: dateString.optional(),
};

export const createTaskSchema = z.object({
  ...taskFields,
  assignedTo: studentId.optional(),
});

// One task, many students: either a list of ids or "all students", not both
export const bulkCreateTaskSchema = z
  .object({
    ...taskFields,
    studentIds: z.array(studentId).min(1, "Select at least one student").max(500).optional(),
    allStudents: z.boolean().optional(),
  })
  .refine((d) => (d.allStudents === true) !== (d.studentIds !== undefined), {
    message: "Provide either studentIds or allStudents: true",
  });

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, "title cannot be empty").max(100).optional(),
    description: z.string().max(1000).nullable().optional(),
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    dueDate: dateString.nullable().optional(),
    assignedTo: studentId.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const listQuerySchema = z.object({
  status: statusEnum.optional(),
});

export const idSchema = z
  .string()
  .regex(/^\d+$/, "id must be a positive integer")
  .transform(Number)
  .refine((n) => n > 0, "id must be a positive integer");