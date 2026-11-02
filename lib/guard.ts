import { redirect } from "next/navigation";
import { getRole, HOME } from "./auth";
import type { Role } from "./types";

/** Für Server-Layouts: nicht eingeloggt -> Login, falsche Rolle -> eigener Bereich. Admin darf überall hin. */
export async function guard(allowed: Role[], path: string, wrongRoleToLogin = false) {
  const role = await getRole();
  if (!role) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (role !== "admin" && !allowed.includes(role)) {
    redirect(wrongRoleToLogin ? `/login?next=${encodeURIComponent(path)}` : HOME[role]);
  }
  return role;
}
