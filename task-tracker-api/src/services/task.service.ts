import { and, asc, eq, getTableColumns, inArray, SQL } from "drizzle-orm";
import { db } from "../db";
import { tasks, users, NewTask } from "../db/schema";
import { AppError } from "../errors/app-error";

export type Actor = { id: number; role: string };
export type TaskFields = Pick<NewTask, "title" | "description" | "priority" | "dueDate">;
export type CreateTaskInput = TaskFields & Pick<NewTask, "assignedTo">;
export type UpdateTaskInput = Partial<CreateTaskInput & Pick<NewTask, "status">>;
export type BulkTarget = { all: true } | { studentIds: number[] };

// The core rule: which tasks may this person see or change?
function visibleTo(actor: Actor): SQL | undefined {
  if (actor.role === "admin") return undefined;                       // everything
  if (actor.role === "teacher") return eq(tasks.createdBy, actor.id); // their own
  return eq(tasks.assignedTo, actor.id);                              // assigned to them
}

function selectTasks() {
  return db
    .select({ ...getTableColumns(tasks), assigneeName: users.name })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id));
}

async function assertStudent(userId: number) {
  const [u] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, userId));
  if (!u || u.role !== "student") {
    throw new AppError(400, "assignedTo must be the id of a student");
  }
}

export async function getAllTasks(actor: Actor, status?: "pending" | "done") {
  return selectTasks()
    .where(and(visibleTo(actor), status ? eq(tasks.status, status) : undefined))
    .orderBy(asc(tasks.id));
}

export async function getTaskById(actor: Actor, id: number) {
  const [task] = await selectTasks().where(and(eq(tasks.id, id), visibleTo(actor)));
  return task ?? null;
}

export async function createTask(actor: Actor, input: CreateTaskInput) {
  if (input.assignedTo != null) await assertStudent(input.assignedTo);
  const [created] = await db
    .insert(tasks)
    .values({ ...input, createdBy: actor.id })
    .returning({ id: tasks.id });
  return getTaskById(actor, created.id);
}

// One task for many students: each student gets their own row
export async function createTasksBulk(actor: Actor, fields: TaskFields, target: BulkTarget) {
  let studentIds: number[];

  if ("all" in target) {
    const students = await db.select({ id: users.id }).from(users).where(eq(users.role, "student"));
    if (students.length === 0) throw new AppError(400, "There are no students to assign to");
    studentIds = students.map((s) => s.id);
  } else {
    studentIds = [...new Set(target.studentIds)];
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, studentIds), eq(users.role, "student")));
    if (found.length !== studentIds.length) {
      throw new AppError(400, "Every studentId must belong to a student");
    }
  }

  // One INSERT statement, so either every student gets the task or nobody does
  const created = await db
    .insert(tasks)
    .values(studentIds.map((id) => ({ ...fields, createdBy: actor.id, assignedTo: id })))
    .returning({ id: tasks.id });

  return selectTasks()
    .where(and(inArray(tasks.id, created.map((c) => c.id)), visibleTo(actor)))
    .orderBy(asc(tasks.id));
}

export async function updateTask(actor: Actor, id: number, input: UpdateTaskInput) {
  if (input.assignedTo != null) await assertStudent(input.assignedTo);
  const [updated] = await db
    .update(tasks)
    .set(input)
    .where(and(eq(tasks.id, id), visibleTo(actor)))
    .returning({ id: tasks.id });
  return updated ? getTaskById(actor, updated.id) : null;
}

export async function deleteTask(actor: Actor, id: number) {
  const [deleted] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), visibleTo(actor)))
    .returning({ id: tasks.id });
  return deleted ?? null;
}