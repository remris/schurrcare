"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { detectLang, t as T } from "@/lib/languages";
import type { HelpEntry } from "@/lib/types";

export default function Hilfe() {
  const [lang, setLang] = useState("");
  const [help, setHelp] = useState<HelpEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let l = "";
    try {
      l = localStorage.getItem("lang") || "";
    } catch {}
    l = l || detectLang();
    setLang(l);
    document.documentElement.lang = l;
    api<HelpEntry[]>(`/api/help?lang=${l}`)
      .then(setHelp)
      .catch((e) => setError((e as Error).message));
  }, []);

  if (!lang) return null;
  const s = T(lang);
  return (
    <main className="page pflege">
      <header className="top">
        <h1>ℹ️ {s.help}</h1>
        <a href="/einkauf" className="btn">← {s.back}</a>
      </header>
      {error && <p className="error">{error}</p>}
      {!help && !error && <div className="spinner" />}
      {help?.length === 0 && <p className="empty">{s.noHelp}</p>}
      <div className="stack">
        {help?.map((h) => {
          const tr = lang !== "de" ? h.translations?.[lang] : undefined;
          return (
            <article key={h.id} className="card stack help">
              {(tr?.title || h.title) && <h2>{tr?.title || h.title}</h2>}
              <p className="pre big-text">{tr?.text || h.text}</p>
              {tr && (
                <details>
                  <summary className="muted">{s.original}</summary>
                  {h.title && <strong>{h.title}</strong>}
                  <p className="pre muted">{h.text}</p>
                </details>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
