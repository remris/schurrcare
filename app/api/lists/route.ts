import { handle, requireRole } from "@/lib/auth";
import { getItems, getLists, newId, saveItem, saveList } from "@/lib/data";
import { translate } from "@/lib/translate";

export const dynamic = "force-dynamic";

// GET /api/lists?lang=uk  -> alle Listen + Einträge (fehlende Übersetzungen werden ergänzt)
export const GET = handle(async (req) => {
  await requireRole("oma", "pflege");
  const lang = new URL(req.url).searchParams.get("lang");
  const [lists, items] = await Promise.all([getLists(), getItems()]);
  if (lang && lang !== "de") {
    const missing = items.filter((i) => !i.translations?.[lang]);
    await Promise.all(
      missing.slice(0, 40).map(async (i) => {
        const tr = await translate(i.text, lang);
        if (tr) {
          i.translations = { ...(i.translations ?? {}), [lang]: tr };
          await saveItem(i);
        }
      })
    );
  }
  return Response.json({ lists, items });
});

export const POST = handle(async (req) => {
  await requireRole("oma");
  const { name } = await req.json();
  const n = String(name ?? "").trim().slice(0, 40);
  if (!n) return Response.json({ error: "Name fehlt" }, { status: 400 });
  const lists = await getLists();
  const list = { id: newId(), name: n, order: lists.length, createdAt: new Date().toISOString() };
  await saveList(list);
  return Response.json(list);
});
