import { handle, requireRole } from "@/lib/auth";
import { deleteList, getList, saveList } from "@/lib/data";

export const PATCH = handle(async (req, ctx) => {
  await requireRole();
  const { id } = await ctx.params;
  const list = await getList(id);
  if (!list) return Response.json({ error: "Nicht gefunden" }, { status: 404 });
  const body = await req.json();
  if (typeof body.name === "string" && body.name.trim()) list.name = body.name.trim().slice(0, 40);
  if (typeof body.order === "number") list.order = body.order;
  await saveList(list);
  return Response.json(list);
});

export const DELETE = handle(async (_req, ctx) => {
  await requireRole();
  const { id } = await ctx.params;
  await deleteList(id);
  return Response.json({ ok: true });
});
