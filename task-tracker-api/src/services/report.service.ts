import { and, asc, eq, gte, lte, SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";
import { tasks, users } from "../db/schema";

export type ReportRange = { from?: string; to?: string };

type Bucket = { total: number; done: number; pending: number; overdue: number };

const newBucket = (): Bucket => ({ total: 0, done: 0, pending: 0, overdue: 0 });
const rate = (done: number, total: number) => (total === 0 ? 0 : Math.round((done / total) * 100));

function bump(b: Bucket, isDone: boolean, isOverdue: boolean) {
  b.total++;
  if (isDone) b.done++;
  else b.pending++;
  if (isOverdue) b.overdue++;
}

export async function getReport(range: ReportRange) {
  const student = alias(users, "student");
  const teacher = alias(users, "teacher");

  const conditions: SQL[] = [];
  if (range.from) conditions.push(gte(tasks.createdAt, new Date(`${range.from}T00:00:00`)));
  if (range.to) conditions.push(lte(tasks.createdAt, new Date(`${range.to}T23:59:59.999`)));

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      studentId: tasks.assignedTo,
      studentName: student.name,
      studentEmail: student.email,
      teacherId: tasks.createdBy,
      teacherName: teacher.name,
    })
    .from(tasks)
    .leftJoin(student, eq(tasks.assignedTo, student.id))
    .leftJoin(teacher, eq(tasks.createdBy, teacher.id))
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate), asc(tasks.id));

  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

  const summary = newBucket();
  const priorities = new Map<string, Bucket>([
    ["high", newBucket()],
    ["medium", newBucket()],
    ["low", newBucket()],
  ]);
  const students = new Map<number, Bucket & { name: string; email: string }>();
  const teachers = new Map<number, Bucket & { name: string }>();
  const overdueTasks: {
    id: number;
    title: string;
    priority: string;
    dueDate: string;
    studentName: string | null;
    teacherName: string | null;
  }[] = [];

  for (const r of rows) {
    const isDone = r.status === "done";
    const isOverdue = !isDone && !!r.dueDate && r.dueDate < today;

    bump(summary, isDone, isOverdue);

    const p = priorities.get(r.priority ?? "medium");
    if (p) bump(p, isDone, isOverdue);

    if (r.studentId != null) {
      if (!students.has(r.studentId)) {
        students.set(r.studentId, { ...newBucket(), name: r.studentName ?? "Unknown", email: r.studentEmail ?? "" });
      }
      bump(students.get(r.studentId)!, isDone, isOverdue);
    }

    if (r.teacherId != null) {
      if (!teachers.has(r.teacherId)) {
        teachers.set(r.teacherId, { ...newBucket(), name: r.teacherName ?? "Unknown" });
      }
      bump(teachers.get(r.teacherId)!, isDone, isOverdue);
    }

    if (isOverdue) {
      overdueTasks.push({
        id: r.id,
        title: r.title,
        priority: r.priority ?? "medium",
        dueDate: r.dueDate!,
        studentName: r.studentName,
        teacherName: r.teacherName,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    range: { from: range.from ?? null, to: range.to ?? null },
    summary: { ...summary, completionRate: rate(summary.done, summary.total) },
    byPriority: [...priorities.entries()].map(([priority, b]) => ({
      priority,
      ...b,
      completionRate: rate(b.done, b.total),
    })),
    byStudent: [...students.values()]
      .map((s) => ({ ...s, completionRate: rate(s.done, s.total) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    byTeacher: [...teachers.values()]
      .map((t) => ({ ...t, completionRate: rate(t.done, t.total) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    overdueTasks,
  };
}