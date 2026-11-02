"use client";
// Kleiner fetch-Wrapper: bei 401 zum Login.
export async function api<T = any>(url: string, opts: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = opts;
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  if (res.status === 401 && !url.startsWith("/api/login")) {
    location.href = "/login?next=" + encodeURIComponent(location.pathname);
    throw new Error("unauthorized");
  }
  if (res.status === 403) {
    location.href = "/";
    throw new Error("forbidden");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Fehler ${res.status}`);
  return data as T;
}
