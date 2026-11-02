import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { Role } from "./types";

const COOKIE = "sc_session";
const secret = () =>
  process.env.AUTH_SECRET || `${process.env.ADMIN_PASSWORD ?? ""}|${process.env.ACCESS_CODE ?? ""}|schnurrcare`;

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkCode(code: string): Role | null {
  const c = code.trim();
  if (!c) return null;
  if (process.env.ADMIN_PASSWORD && safeEqual(c, process.env.ADMIN_PASSWORD)) return "admin";
  if (process.env.ACCESS_CODE && safeEqual(c.toLowerCase(), process.env.ACCESS_CODE.toLowerCase())) return "family";
  return null;
}

export async function setSession(role: Role) {
  const days = role === "admin" ? 30 : 400;
  const exp = Date.now() + days * 864e5;
  const payload = `${role}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: days * 86400,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getRole(): Promise<Role | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return null;
  const [role, exp, sig] = v.split(".");
  if (!role || !exp || !sig) return null;
  if (!safeEqual(sig, sign(`${role}.${exp}`))) return null;
  if (Number(exp) < Date.now()) return null;
  return role === "admin" || role === "family" ? role : null;
}

/** Wirft eine 401-Response, wenn nicht eingeloggt (admin darf alles). */
export async function requireRole(need: Role = "family"): Promise<Role> {
  const role = await getRole();
  if (!role || (need === "admin" && role !== "admin")) {
    throw new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return role;
}

export function handle(fn: (req: Request, ctx: any) => Promise<Response>) {
  return async (req: Request, ctx: any) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return Response.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
    }
  };
}
