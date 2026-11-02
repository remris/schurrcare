import { redirect } from "next/navigation";
import { getRole, HOME } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Startseite: leitet je nach Zugang direkt in den richtigen Bereich
export default async function Home() {
  const role = await getRole();
  redirect(role ? HOME[role] : "/login");
}
