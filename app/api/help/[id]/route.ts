import { handle, requireRole } from "@/lib/auth";
import { deleteHelp, getHelpEntry, saveHelp } from "@/lib/data";

export const PATCH = handle(async (req, ctx) => {
  await requireRole("admin");
  const { id } = await ctx.params;
  const h = await getHelpEntry(id);
  if (!h) return Response.json({ error: "Nicht gefunden" }, { status: 404 });
  const body = await req.json();
  let changed = false;
  if (typeof body.title === "string" && body.title.trim() !== h.title) {
    h.title = body.title.trim().slice(0, 100);
    changed = true;
  }
  if (typeof body.text === "string" && body.text.trim() && body.text.trim() !== h.text) {
    h.text = body.text.trim().slice(0, 4000);
    changed = true;
  }
  if (changed) {
    h.translations = {}; // neu übersetzen
    h.updatedAt = new Date().toISOString();
  }
  if (typeof body.order === "number") h.order = body.order;
  await saveHelp(h);
  return Response.json(h);
});

export const DELETE = handle(async (_req, ctx) => {
  await requireRole("admin");
  const { id } = await ctx.params;
  await deleteHelp(id);
  return Response.json({ ok: true });
});
