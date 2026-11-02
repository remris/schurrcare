import { getRole, handle } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const GET = handle(async () => Response.json({ role: await getRole() }));
