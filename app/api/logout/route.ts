import { clearSession, handle } from "@/lib/auth";

export const POST = handle(async () => {
  await clearSession();
  return Response.json({ ok: true });
});
