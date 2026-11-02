import { handle, requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Nur für Admin: fertige Einladungslinks für Oma und Pflegerin
export const GET = handle(async (req) => {
  await requireRole("admin");
  const origin = new URL(req.url).origin;
  const link = (code?: string) => (code ? `${origin}/login?code=${encodeURIComponent(code.trim())}` : null);
  return Response.json({ oma: link(process.env.OMA_CODE), pflege: link(process.env.PFLEGE_CODE) });
});
