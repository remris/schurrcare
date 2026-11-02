import { handle, requireRole } from "@/lib/auth";
import { getDocs, newId, saveDoc } from "@/lib/data";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireRole("admin");
  return Response.json(await getDocs());
});

export const POST = handle(async (req) => {
  await requireRole("admin");
  const { title } = await req.json();
  const now = new Date().toISOString();
  const doc = { id: newId(), title: String(title ?? "").trim().slice(0, 100) || "Vertrag", createdAt: now, updatedAt: now, pages: [] };
  await saveDoc(doc);
  return Response.json(doc);
});
