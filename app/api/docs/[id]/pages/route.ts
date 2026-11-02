import { handle, requireRole } from "@/lib/auth";
import { getDoc, newId, saveDoc, saveDocPage } from "@/lib/data";
import type { DocPage } from "@/lib/types";

export const maxDuration = 30;

// POST { data: "data:image/jpeg;base64,..." | "data:application/pdf;base64,...", name }
export const POST = handle(async (req, ctx) => {
  await requireRole("admin");
  const { id } = await ctx.params;
  const doc = await getDoc(id);
  if (!doc) return Response.json({ error: "Dokument nicht gefunden" }, { status: 404 });
  const { data, name } = await req.json();
  const m = String(data ?? "").match(/^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,/);
  if (!m) return Response.json({ error: "Nur Bilder oder PDF" }, { status: 400 });
  const size = Math.round(((data as string).length - m[0].length) * 0.75);
  if (size > 3_000_000) return Response.json({ error: "Datei zu groß (max. 3 MB)" }, { status: 413 });
  const page: DocPage = {
    id: newId(),
    type: m[1] === "application/pdf" ? "pdf" : "image",
    name: String(name ?? "").slice(0, 120) || `Seite ${doc.pages.length + 1}`,
    size,
    addedAt: new Date().toISOString(),
  };
  await saveDocPage(page.id, data);
  doc.pages.push(page);
  doc.updatedAt = page.addedAt;
  await saveDoc(doc);
  return Response.json(doc);
});
