import { checkCode, handle, setSession } from "@/lib/auth";

export const POST = handle(async (req) => {
  const { code } = await req.json().catch(() => ({ code: "" }));
  const role = checkCode(String(code ?? ""));
  if (!role) return Response.json({ error: "Falscher Code" }, { status: 401 });
  await setSession(role);
  return Response.json({ role });
});
