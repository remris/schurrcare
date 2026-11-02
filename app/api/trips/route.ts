import { handle, requireRole } from "@/lib/auth";
import { addTrip, deleteItems, getItems, getList, getTrips, newId } from "@/lib/data";
import type { Trip } from "@/lib/types";

export const dynamic = "force-dynamic";

// Einkauf abschließen: abgehakte Einträge wandern in die Historie
export const POST = handle(async (req) => {
  await requireRole();
  const body = await req.json();
  const list = await getList(String(body.listId));
  if (!list) return Response.json({ error: "Liste fehlt" }, { status: 400 });
  const items = (await getItems()).filter((i) => i.listId === list.id);
  const bought = items.filter((i) => i.bought);
  if (!bought.length) return Response.json({ error: "Nichts abgehakt" }, { status: 400 });
  const lang: string | undefined = body.lang;
  const image: string | undefined =
    typeof body.image === "string" && body.image.startsWith("data:image/") && body.image.length < 900_000
      ? body.image
      : undefined;
  const trip: Trip = {
    id: newId(),
    listId: list.id,
    listName: list.name,
    date: new Date().toISOString(),
    lang,
    bought: bought.map((i) => ({ text: i.text, translation: lang ? i.translations?.[lang] : undefined, addedAt: i.createdAt })),
    notBought: items.filter((i) => !i.bought).map((i) => ({ text: i.text })),
    receipt: body.receipt
      ? {
          method: body.receipt.method === "claude" ? "claude" : "tesseract",
          hasImage: !!image,
          matches: Array.isArray(body.receipt.matches) ? body.receipt.matches.slice(0, 100) : [],
          lines: Array.isArray(body.receipt.lines) ? body.receipt.lines.slice(0, 100).map(String) : [],
          total: body.receipt.total ? String(body.receipt.total) : undefined,
        }
      : undefined,
  };
  await addTrip(trip, image);
  await deleteItems(bought.map((i) => i.id));
  return Response.json(trip);
});

export const GET = handle(async () => {
  await requireRole("admin");
  return Response.json(await getTrips());
});
