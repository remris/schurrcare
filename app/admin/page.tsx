"use client";
import { useEffect, useState } from "react";
import ListEditor from "@/components/ListEditor";
import HelpEditor from "@/components/HelpEditor";
import { api } from "@/lib/api";
import type { Trip } from "@/lib/types";

export default function Admin() {
  const [tab, setTab] = useState<"lists" | "history" | "help">("lists");
  const [role, setRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    api<{ role: string | null }>("/api/me").then((d) => setRole(d.role));
  }, []);

  if (role === undefined) return <main className="page center muted">…</main>;
  if (role !== "admin") {
    return (
      <main className="page center">
        <p>Für den Admin-Bereich bitte mit dem Admin-Passwort anmelden.</p>
        <a className="btn primary" href="/login?next=/admin">Zum Login</a>
      </main>
    );
  }

  return (
    <main className="page admin">
      <header className="top">
        <h1>Admin</h1>
        <button
          className="btn"
          onClick={async () => {
            await api("/api/logout", { method: "POST" });
            location.href = "/login";
          }}
        >
          Abmelden
        </button>
      </header>
      <div className="tabs">
        <button className={"tab" + (tab === "lists" ? " on" : "")} onClick={() => setTab("lists")}>Listen</button>
        <button className={"tab" + (tab === "history" ? " on" : "")} onClick={() => setTab("history")}>Historie</button>
        <button className={"tab" + (tab === "help" ? " on" : "")} onClick={() => setTab("help")}>Hilfe</button>
      </div>
      {tab === "lists" && <ListEditor admin />}
      {tab === "history" && <History />}
      {tab === "help" && <HelpEditor />}
      <Invite />
    </main>
  );
}

function History() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api<Trip[]>("/api/trips").then(setTrips);
  }, []);

  if (!trips) return <p className="muted">Lade …</p>;
  const q = filter.trim().toLowerCase();
  const shown = q
    ? trips.filter((t) => t.listName.toLowerCase().includes(q) || t.bought.some((b) => b.text.toLowerCase().includes(q)))
    : trips;

  const csv = () => {
    const rows = [["Datum", "Liste", "Artikel", "Übersetzung", "Auf Kassenzettel"]];
    for (const t of trips)
      for (const b of t.bought) {
        const m = t.receipt?.matches.find((x) => x.text === b.text);
        rows.push([new Date(t.date).toLocaleString("de-DE"), t.listName, b.text, b.translation ?? "", m ? (m.found ? "ja" : "nein") : ""]);
      }
    const blob = new Blob(["﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "einkaufs-historie.csv";
    a.click();
  };

  return (
    <div className="stack">
      <div className="addbar">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Suchen (Artikel oder Liste)" />
        <button className="btn" onClick={csv}>CSV</button>
      </div>
      {shown.length === 0 && <p className="muted">Noch keine Einkäufe gespeichert.</p>}
      {shown.map((t) => {
        const found = t.receipt?.matches.filter((m) => m.found).length ?? 0;
        return (
          <div key={t.id} className="card trip">
            <button className="triphead" onClick={() => setOpen(open === t.id ? null : t.id)}>
              <strong>{t.listName}</strong>
              <span>{new Date(t.date).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</span>
              <span className="muted">
                {t.bought.length} Artikel{t.receipt ? ` · 🧾 ${found}/${t.receipt.matches.length} erkannt` : ""}
                {t.receipt?.total ? ` · ${t.receipt.total}` : ""}
              </span>
            </button>
            {open === t.id && (
              <div className="tripbody">
                <ul className="plain">
                  {t.bought.map((b, i) => {
                    const m = t.receipt?.matches.find((x) => x.text === b.text);
                    return (
                      <li key={i}>
                        {m ? (m.found ? "✅" : "❓") : "✔"} {b.text}
                        {b.translation && <span className="muted"> · {b.translation}</span>}
                        {m?.line && <span className="muted"> → „{m.line}“</span>}
                      </li>
                    );
                  })}
                </ul>
                {t.notBought.length > 0 && (
                  <p className="muted">Nicht gekauft: {t.notBought.map((n) => n.text).join(", ")}</p>
                )}
                {t.receipt && t.receipt.lines.length > 0 && (
                  <details>
                    <summary>Erkannte Zeilen auf dem Kassenzettel ({t.receipt.method})</summary>
                    <pre>{t.receipt.lines.join("\n")}</pre>
                  </details>
                )}
                {t.receipt?.hasImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="receipt" src={`/api/trips/${t.id}/image`} alt="Kassenzettel" loading="lazy" />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Invite() {
  return (
    <details className="card">
      <summary>So kommen Oma und die Pflegerin in die App</summary>
      <p>
        Schicke beiden diesen Link (mit eurem Zugangscode statt <code>CODE</code>):<br />
        <code>{typeof location !== "undefined" ? location.origin : ""}/login?code=CODE</code>
      </p>
      <p>
        Danach im Handy-Browser „Zum Startbildschirm hinzufügen“ bzw. „App installieren“ wählen. Beim ersten Öffnen
        wählt man einmal „Liste schreiben“ (Oma) oder „Einkaufen“ (Pflegerin).
      </p>
    </details>
  );
}
