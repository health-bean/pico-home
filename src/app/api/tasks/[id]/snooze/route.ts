import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/auth/get-app-user";
import { db } from "@/lib/db";
import { taskInstances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const days = body.days ?? 7;

  const [task] = await db
    .select()
    .from(taskInstances)
    .where(eq(taskInstances.id, id));

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const currentDue = new Date(task.nextDueDate);
  currentDue.setDate(currentDue.getDate() + days);

  await db
    .update(taskInstances)
    .set({
      nextDueDate: currentDue.toISOString().split("T")[0],
      updatedAt: new Date(),
    })
    .where(eq(taskInstances.id, id));

  return NextResponse.json({ success: true, nextDueDate: currentDue });
}
