import { handle, requireRole } from "@/lib/auth";
import { deleteDocPage, getDoc, getDocPage, saveDoc } from "@/lib/data";

export const dynamic = "force-dynamic";

// Seite als Bild/PDF ausliefern (?download=1 zum Herunterladen)
export const GET = handle(async (req, ctx) => {
  await requireRole("admin");
  const { id, pageId } = await ctx.params;
  const doc = await getDoc(id);
  const page = doc?.pages.find((p) => p.id === pageId);
  const data = page ? await getDocPage(pageId) : null;
  if (!doc || !page || !data) return new Response("Nicht gefunden", { status: 404 });
  const m = data.match(/^data:([a-z/+-]+);base64,(.*)$/s);
  if (!m) return new Response("Ungültig", { status: 500 });
  const ext = page.type === "pdf" ? "pdf" : "jpg";
  const filename = `${doc.title} - ${doc.pages.indexOf(page) + 1}.${ext}`.replace(/[^\p{L}\p{N} ._-]/gu, "_");
  const dl = new URL(req.url).searchParams.has("download");
  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "content-type": m[1],
      "cache-control": "private, max-age=31536000, immutable",
      "content-disposition": `${dl ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
});

export const DELETE = handle(async (_req, ctx) => {
  await requireRole("admin");
  const { id, pageId } = await ctx.params;
  const doc = await getDoc(id);
  if (!doc) return Response.json({ error: "Nicht gefunden" }, { status: 404 });
  doc.pages = doc.pages.filter((p) => p.id !== pageId);
  doc.updatedAt = new Date().toISOString();
  await deleteDocPage(pageId);
  await saveDoc(doc);
  return Response.json(doc);
});
