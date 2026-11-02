"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// Startseite: merkt sich auf jedem Handy, wer es benutzt (Oma oder Pflegerin)
export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<{ role: string | null }>("/api/me").then(({ role }) => {
      if (!role) return router.replace("/login");
      let who: string | null = null;
      try {
        if (new URLSearchParams(location.search).has("choose")) localStorage.removeItem("who");
        who = localStorage.getItem("who");
      } catch {}
      if (who === "oma") return router.replace("/oma");
      if (who === "pflege") return router.replace("/einkauf");
      setReady(true);
    });
  }, [router]);

  const pick = (who: "oma" | "pflege") => {
    try {
      localStorage.setItem("who", who);
    } catch {}
    router.push(who === "oma" ? "/oma" : "/einkauf");
  };

  if (!ready) return <main className="page center"><p className="muted">…</p></main>;
  return (
    <main className="page center">
      <div className="logo-mark">🧺</div>
      <h1 className="logo">Einkaufsliste</h1>
      <p className="muted">Wer benutzt dieses Handy?</p>
      <div className="stack wide">
        <button className="big" onClick={() => pick("oma")}>
          <span className="ico">✍️</span>
          <span>
            Liste schreiben
            <small>für Oma</small>
          </span>
        </button>
        <button className="big alt" onClick={() => pick("pflege")}>
          <span className="ico">🛒</span>
          <span>
            Einkaufen · Покупки · Zakupy
            <small>für die Pflegerin</small>
          </span>
        </button>
      </div>
    </main>
  );
}
