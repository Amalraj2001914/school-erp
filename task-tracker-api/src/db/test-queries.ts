import { eq } from "drizzle-orm";
import { db } from "./index";
import { tasks } from "./schema";

async function main() {
  // INSERT
  const created = await db
    .insert(tasks)
    .values({ title: "Learn Drizzle", description: "Step 4" })
    .returning();
  console.log("Inserted:", created);

  // SELECT all
  const all = await db.select().from(tasks);
  console.log("All tasks:", all);

  // SELECT with WHERE
  const id = created[0].id;
  const one = await db.select().from(tasks).where(eq(tasks.id, id));
  console.log("Found:", one[0]);

  // UPDATE
  const updated = await db
    .update(tasks)
    .set({ status: "done" })
    .where(eq(tasks.id, id))
    .returning();
  console.log("Updated:", updated[0]);

  // DELETE
  const deleted = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  console.log("Deleted:", deleted[0]);
}

main()
  .catch((err) => console.error("Error:", err))
  .finally(() => process.exit(0));