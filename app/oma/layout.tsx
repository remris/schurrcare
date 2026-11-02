import { guard } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function OmaLayout({ children }: { children: React.ReactNode }) {
  await guard(["oma"], "/oma");
  return children;
}
