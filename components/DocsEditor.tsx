"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Doc } from "@/lib/types";

const pageUrl = (d: Doc, pid: string) => `/api/docs/${d.id}/pages/${pid}`;
const kb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1000)} KB`);

export default function DocsEditor() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setDocs(await api<Doc[]>("/api/docs"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const replace = (d: Doc) => setDocs((p) => p?.map((x) => (x.id === d.id ? d : x)) ?? null);

  return (
    <div className="stack">
      <p className="muted">
        Verträge und wichtige Unterlagen. Seiten mit dem Handy fotografieren oder als Bild/PDF hochladen. Nur im
        Admin-Bereich sichtbar.
      </p>
      <form
        className="addbar"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return;
          const d = await api<Doc>("/api/docs", { method: "POST", json: { title } });
          setTitle("");
          setDocs((p) => [d, ...(p ?? [])]);
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Neues Dokument, z. B. Pflegevertrag" />
        <button className="btn primary" disabled={!title.trim()}>+</button>
      </form>
      {error && <p className="error">{error}</p>}
      {!docs && <p className="muted">Lade …</p>}
      {docs?.length === 0 && <p className="empty">Noch keine Dokumente.</p>}
      {docs?.map((d) => (
        <DocCard key={d.id} doc={d} onChange={replace} onDelete={() => setDocs((p) => p?.filter((x) => x.id !== d.id) ?? null)} />
      ))}
    </div>
  );
}

function DocCard({ doc, onChange, onDelete }: { doc: Doc; onChange: (d: Doc) => void; onDelete: () => void }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<number | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    const list = Array.from(files);
    let current = doc;
    for (const [i, f] of list.entries()) {
      setBusy(`Seite ${i + 1} von ${list.length} wird gespeichert …`);
      try {
        const data = f.type === "application/pdf" ? await readAsDataUrl(f) : await compressImage(f);
        current = await api<Doc>(`/api/docs/${doc.id}/pages`, { method: "POST", json: { data, name: f.name } });
        onChange(current);
      } catch (e) {
        setError(`${f.name}: ${(e as Error).message}`);
      }
    }
    setBusy("");
  };

  const removePage = async (pid: string) => {
    if (!confirm("Diese Seite löschen?")) return;
    onChange(await api<Doc>(`/api/docs/${doc.id}/pages/${pid}`, { method: "DELETE" }));
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const ids = doc.pages.map((p) => p.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    onChange(await api<Doc>(`/api/docs/${doc.id}`, { method: "PATCH", json: { order: ids } }));
  };

  const rename = async () => {
    const t = prompt("Neuer Titel", doc.title);
    if (t?.trim()) onChange(await api<Doc>(`/api/docs/${doc.id}`, { method: "PATCH", json: { title: t } }));
  };

  const del = async () => {
    if (!confirm(`„${doc.title}“ mit allen ${doc.pages.length} Seiten löschen?`)) return;
    await api(`/api/docs/${doc.id}`, { method: "DELETE" });
    onDelete();
  };

  return (
    <div className="card stack">
      <div className="row between">
        <div>
          <strong className="doc-title">📄 {doc.title}</strong>
          <div className="muted small-text">
            {doc.pages.length} {doc.pages.length === 1 ? "Seite" : "Seiten"} · zuletzt geändert{" "}
            {new Date(doc.updatedAt).toLocaleDateString("de-DE")}
          </div>
        </div>
        <span className="row">
          <button className="btn small" onClick={rename}>Umbenennen</button>
          <button className="btn small danger" onClick={del}>Löschen</button>
        </span>
      </div>

      {doc.pages.length > 0 && (
        <div className="pages">
          {doc.pages.map((p, i) => (
            <figure key={p.id} className="page-tile">
              <button className="page-thumb" onClick={() => setView(i)} aria-label={`Seite ${i + 1} ansehen`}>
                {p.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pageUrl(doc, p.id)} alt={`Seite ${i + 1}`} loading="lazy" />
                ) : (
                  <span className="pdf">PDF</span>
                )}
                <span className="page-no">{i + 1}</span>
              </button>
              <figcaption className="row">
                <button className="mini" onClick={() => move(i, -1)} disabled={i === 0} aria-label="nach vorne">←</button>
                <button className="mini" onClick={() => move(i, 1)} disabled={i === doc.pages.length - 1} aria-label="nach hinten">→</button>
                <button className="mini danger" onClick={() => removePage(p.id)} aria-label="Seite löschen">🗑</button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="row">
        <label className="btn primary">
          📷 Seite fotografieren
          <input type="file" accept="image/*" capture="environment" hidden disabled={!!busy}
            onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </label>
        <label className="btn">
          📎 Dateien hinzufügen
          <input type="file" accept="image/*,application/pdf" multiple hidden disabled={!!busy}
            onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </label>
      </div>
      {busy && <p className="muted">⏳ {busy}</p>}
      {error && <p className="error">{error}</p>}

      {view !== null && doc.pages[view] && (
        <Viewer doc={doc} index={view} onIndex={setView} onClose={() => setView(null)} />
      )}
    </div>
  );
}

function Viewer({ doc, index, onIndex, onClose }: { doc: Doc; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const p = doc.pages[index];
  const url = pageUrl(doc, p.id);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < doc.pages.length - 1) onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, doc.pages.length, onIndex, onClose]);

  return (
    <div className="viewer" onClick={onClose}>
      <div className="viewer-bar" onClick={(e) => e.stopPropagation()}>
        <strong>
          {doc.title} · Seite {index + 1}/{doc.pages.length}
        </strong>
        <span className="row">
          <a className="btn small" href={url} target="_blank" rel="noreferrer">Öffnen</a>
          <a className="btn small" href={`${url}?download=1`}>Herunterladen</a>
          <button className="btn small" onClick={onClose}>✕</button>
        </span>
      </div>
      <div className="viewer-body" onClick={(e) => e.stopPropagation()}>
        {p.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Seite ${index + 1}`} />
        ) : (
          <iframe src={url} title={p.name} />
        )}
      </div>
      <div className="viewer-nav" onClick={(e) => e.stopPropagation()}>
        <button className="btn" disabled={index === 0} onClick={() => onIndex(index - 1)}>← Zurück</button>
        <span className="muted">{p.name} · {kb(p.size)}</span>
        <button className="btn" disabled={index === doc.pages.length - 1} onClick={() => onIndex(index + 1)}>Weiter →</button>
      </div>
    </div>
  );
}

function readAsDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Datei konnte nicht gelesen werden"));
    r.readAsDataURL(f);
  });
}

/** Foto verkleinern: lange Seite max. 2000 px, JPEG – Text bleibt gut lesbar, Datei ca. 0,3–0,8 MB */
async function compressImage(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Bild konnte nicht gelesen werden"));
      i.src = url;
    });
    const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}
