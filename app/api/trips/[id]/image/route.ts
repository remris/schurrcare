import { handle, requireRole } from "@/lib/auth";
import { getReceiptImage } from "@/lib/data";

export const dynamic = "force-dynamic";

export const GET = handle(async (_req, ctx) => {
  await requireRole("admin");
  const { id } = await ctx.params;
  const img = await getReceiptImage(id);
  if (!img) return new Response("Nicht gefunden", { status: 404 });
  const m = img.match(/^data:(image\/[a-z]+);base64,(.*)$/);
  if (!m) return new Response("Ungültig", { status: 500 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "content-type": m[1], "cache-control": "private, max-age=86400" },
  });
});
