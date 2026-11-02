import { handle, requireRole } from "@/lib/auth";
import { getHelp, newId, saveHelp } from "@/lib/data";
import { translate } from "@/lib/translate";
import type { HelpEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/help?lang=uk -> Hinweise, fehlende Übersetzungen werden ergänzt und gespeichert
export const GET = handle(async (req) => {
  await requireRole("pflege");
  const lang = new URL(req.url).searchParams.get("lang");
  const help = await getHelp();
  if (lang && lang !== "de") {
    await Promise.all(
      help
        .filter((h) => !h.translations?.[lang])
        .map(async (h) => {
          const [title, text] = await Promise.all([
            h.title ? translate(h.title, lang) : Promise.resolve(""),
            translateLong(h.text, lang),
          ]);
          if (title !== null && text !== null) {
            h.translations = { ...(h.translations ?? {}), [lang]: { title, text } };
            await saveHelp(h);
          }
        })
    );
  }
  return Response.json(help);
});

// Absatzweise übersetzen, damit Zeilenumbrüche erhalten bleiben
async function translateLong(text: string, lang: string) {
  const parts = text.split(/(\n+)/);
  const out = await Promise.all(parts.map((p) => (p.trim() ? translate(p, lang) : Promise.resolve(p))));
  return out.some((o) => o === null) ? null : out.join("");
}

export const POST = handle(async (req) => {
  await requireRole("admin");
  const body = await req.json();
  const text = String(body.text ?? "").trim().slice(0, 4000);
  if (!text) return Response.json({ error: "Text fehlt" }, { status: 400 });
  const entry: HelpEntry = {
    id: newId(),
    title: String(body.title ?? "").trim().slice(0, 100),
    text,
    order: (await getHelp()).length,
    updatedAt: new Date().toISOString(),
    translations: {},
  };
  await saveHelp(entry);
  return Response.json(entry);
});
