"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Login() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (c: string) => {
    setBusy(true);
    setError("");
    try {
      const { role } = await api<{ role: string }>("/api/login", { method: "POST", json: { code: c } });
      const next = new URLSearchParams(location.search).get("next");
      location.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  // Einladungslink: /login?code=XYZ
  useEffect(() => {
    const c = new URLSearchParams(location.search).get("code");
    if (c) submit(c);
  }, []);

  return (
    <main className="page center">
      <div className="logo-mark">🧺</div>
      <h1 className="logo">Einkaufsliste</h1>
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          submit(code);
        }}
      >
        <label htmlFor="code">Zugangscode · Код · Kod</label>
        <input id="code" value={code} onChange={(e) => setCode(e.target.value)} autoFocus autoCapitalize="none" type="password" />
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={busy || !code}>
          {busy ? "…" : "OK"}
        </button>
      </form>
    </main>
  );
}
