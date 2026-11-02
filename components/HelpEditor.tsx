"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";
import type { HelpEntry } from "@/lib/types";

export default function HelpEditor() {
  const [help, setHelp] = useState<HelpEntry[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // id oder "new"
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState("uk");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setHelp(await api<HelpEntry[]>(`/api/help?lang=${preview}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [preview]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (h?: HelpEntry) => {
    setEditing(h ? h.id : "new");
    setTitle(h?.title ?? "");
    setText(h?.text ?? "");
  };

  const save = async () => {
    setError("");
    try {
      if (editing === "new") await api("/api/help", { method: "POST", json: { title, text } });
      else await api(`/api/help/${editing}`, { method: "PATCH", json: { title, text } });
      setEditing(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const del = async (h: HelpEntry) => {
    if (!confirm(`„${h.title || h.text.slice(0, 30)}“ löschen?`)) return;
    await api(`/api/help/${h.id}`, { method: "DELETE" });
    load();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    if (!help) return;
    const a = help[idx], b = help[idx + dir];
    if (!b) return;
    await Promise.all([
      api(`/api/help/${a.id}`, { method: "PATCH", json: { order: idx + dir } }),
      api(`/api/help/${b.id}`, { method: "PATCH", json: { order: idx } }),
    ]);
    load();
  };

  const form = (
    <div className="card stack">
      <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel, z. B. Brot beim Bäcker" />
      <textarea
        className="field"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Erklärung auf Deutsch, z. B.\nOma mag nur Vollkornbrot, geschnitten.\nKassenzettel bitte immer fotografieren."}
      />
      <div className="row">
        <button className="btn primary" onClick={save} disabled={!text.trim()}>Speichern</button>
        <button className="btn ghost" onClick={() => setEditing(null)}>Abbrechen</button>
      </div>
    </div>
  );

  return (
    <div className="stack">
      <p className="muted">
        Hinweise für die Pflegerin. Sie sieht sie über den ℹ️-Knopf automatisch übersetzt in ihrer Sprache.
      </p>
      <div className="row">
        {editing !== "new" && (
          <button className="btn primary" onClick={() => startEdit()}>+ Neuer Hinweis</button>
        )}
        <label className="muted row">
          Vorschau:
          <select value={preview} onChange={(e) => setPreview(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </label>
      </div>
      {editing === "new" && form}
      {error && <p className="error">{error}</p>}
      {!help && <p className="muted">Lade …</p>}
      {help?.length === 0 && editing !== "new" && <p className="muted">Noch keine Hinweise.</p>}
      {help?.map((h, i) =>
        editing === h.id ? (
          <div key={h.id}>{form}</div>
        ) : (
          <div key={h.id} className="card stack help">
            <div className="row between">
              <strong>{h.title || "(ohne Titel)"}</strong>
              <span className="row">
                <button className="btn small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="nach oben">↑</button>
                <button className="btn small" onClick={() => move(i, 1)} disabled={i === help.length - 1} aria-label="nach unten">↓</button>
                <button className="btn small" onClick={() => startEdit(h)}>Bearbeiten</button>
                <button className="btn small danger" onClick={() => del(h)}>Löschen</button>
              </span>
            </div>
            <p className="pre">{h.text}</p>
            {preview !== "de" && h.translations?.[preview] && (
              <div className="translated">
                <strong>{h.translations[preview].title}</strong>
                <p className="pre">{h.translations[preview].text}</p>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
