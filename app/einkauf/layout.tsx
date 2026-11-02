import { guard } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function EinkaufLayout({ children }: { children: React.ReactNode }) {
  await guard(["pflege"], "/einkauf");
  return children;
}
