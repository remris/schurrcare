import { handle, requireRole } from "@/lib/auth";
import { deleteItems, getItem, saveItem } from "@/lib/data";

export const PATCH = handle(async (req, ctx) => {
  await requireRole();
  const { id } = await ctx.params;
  const item = await getItem(id);
  if (!item) return Response.json({ error: "Nicht gefunden" }, { status: 404 });
  const body = await req.json();
  if (typeof body.bought === "boolean") {
    item.bought = body.bought;
    item.boughtAt = body.bought ? new Date().toISOString() : undefined;
  }
  if (typeof body.text === "string" && body.text.trim() && body.text.trim() !== item.text) {
    item.text = body.text.trim().slice(0, 80);
    item.translations = {};
  }
  if (typeof body.listId === "string") item.listId = body.listId;
  await saveItem(item);
  return Response.json(item);
});

export const DELETE = handle(async (_req, ctx) => {
  await requireRole();
  const { id } = await ctx.params;
  await deleteItems([id]);
  return Response.json({ ok: true });
});
