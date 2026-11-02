// Optionale Kassenzettel-Erkennung per Claude (nur wenn ANTHROPIC_API_KEY gesetzt ist).
// Ohne Key antwortet die Route mit {available:false} und das Handy nutzt Tesseract.
import { handle, requireRole } from "@/lib/auth";

export const maxDuration = 60;

export const GET = handle(async () => {
  await requireRole("pflege");
  return Response.json({ available: !!process.env.ANTHROPIC_API_KEY });
});

export const POST = handle(async (req) => {
  await requireRole("pflege");
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ available: false });
  const { image, items } = (await req.json()) as { image: string; items: { id: string; text: string }[] };
  const m = String(image ?? "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return Response.json({ error: "Bild fehlt" }, { status: 400 });

  const prompt = `Das ist ein deutscher Kassenzettel. Einkaufsliste (id: Eintrag):
${items.map((i) => `${i.id}: ${i.text}`).join("\n")}

Antworte NUR mit JSON in dieser Form:
{"lines":["<jedes gekaufte Produkt so wie auf dem Zettel>"],"total":"<Summe z.B. 12,34 €>","matches":[{"itemId":"<id>","found":true|false,"line":"<passende Zeile oder leer>"}]}
Ordne jedem Listeneintrag zu, ob er auf dem Zettel steht (auch bei Abkürzungen wie "MISCHBR." = Brot, "H-MILCH" = Milch).`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error("Claude-Fehler", res.status, await res.text());
    return Response.json({ available: false });
  }
  const j = await res.json();
  const text: string = j?.content?.find((c: { type: string }) => c.type === "text")?.text ?? "";
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  try {
    const parsed = JSON.parse(json ?? "");
    const byId = new Map(items.map((i) => [i.id, i.text]));
    return Response.json({
      available: true,
      method: "claude",
      lines: (parsed.lines ?? []).map(String),
      total: parsed.total ? String(parsed.total) : undefined,
      matches: (parsed.matches ?? [])
        .filter((x: { itemId: string }) => byId.has(x.itemId))
        .map((x: { itemId: string; found: boolean; line?: string }) => ({
          itemId: x.itemId,
          text: byId.get(x.itemId),
          found: !!x.found,
          line: x.line || undefined,
        })),
    });
  } catch {
    return Response.json({ available: false });
  }
});
