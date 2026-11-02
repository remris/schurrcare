import { guard } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Wer nicht Admin ist, bekommt das Login für das Admin-Passwort
  await guard([], "/admin", true);
  return children;
}
