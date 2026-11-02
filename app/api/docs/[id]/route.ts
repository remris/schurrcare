import { handle, requireRole } from "@/lib/auth";
import { deleteDoc, getDoc, saveDoc } from "@/lib/data";

export const PATCH = handle(async (req, ctx) => {
  await requireRole("admin");
  const { id } = await ctx.params;
  const doc = await getDoc(id);
  if (!doc) return Response.json({ error: "Nicht gefunden" }, { status: 404 });
  const body = await req.json();
  if (typeof body.title === "string" && body.title.trim()) doc.title = body.title.trim().slice(0, 100);
  // neue Reihenfolge der Seiten: Liste von Seiten-IDs
  if (Array.isArray(body.order)) {
    const byId = new Map(doc.pages.map((p) => [p.id, p]));
    const sorted = body.order.map((pid: string) => byId.get(pid)).filter(Boolean);
    if (sorted.length === doc.pages.length) doc.pages = sorted;
  }
  doc.updatedAt = new Date().toISOString();
  await saveDoc(doc);
  return Response.json(doc);
});

export const DELETE = handle(async (_req, ctx) => {
  await requireRole("admin");
  const { id } = await ctx.params;
  const doc = await getDoc(id);
  if (doc) await deleteDoc(doc);
  return Response.json({ ok: true });
});
