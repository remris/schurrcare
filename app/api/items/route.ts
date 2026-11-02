import { handle, requireRole } from "@/lib/auth";
import { getList, newId, saveItem } from "@/lib/data";
import type { Item } from "@/lib/types";

// POST { listId, texts: string[] }  – mehrere Einträge auf einmal (z.B. "Brot, Milch und Butter")
export const POST = handle(async (req) => {
  const role = await requireRole("oma");
  const body = await req.json();
  if (!(await getList(String(body.listId)))) return Response.json({ error: "Liste fehlt" }, { status: 400 });
  const texts: string[] = (Array.isArray(body.texts) ? body.texts : [body.text])
    .map((t: unknown) => String(t ?? "").trim().slice(0, 80))
    .filter(Boolean);
  const created: Item[] = [];
  for (const text of texts) {
    const item: Item = {
      id: newId(),
      listId: body.listId,
      text: text.charAt(0).toUpperCase() + text.slice(1),
      translations: {},
      createdAt: new Date().toISOString(),
      createdBy: role === "admin" ? "admin" : "oma",
      bought: false,
    };
    await saveItem(item);
    created.push(item);
  }
  return Response.json(created);
});
