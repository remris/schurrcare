"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Item, ShopList } from "@/lib/types";
import { splitItems, useSpeech } from "./useSpeech";

export default function ListEditor({ admin = false }: { admin?: boolean }) {
  const [lists, setLists] = useState<ShopList[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<string>("");
  const [text, setText] = useState("");
  const [manage, setManage] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ lists: ShopList[]; items: Item[] }>("/api/lists");
      setLists(d.lists);
      setItems(d.items);
      setActive((a) => (d.lists.some((l) => l.id === a) ? a : d.lists[0]?.id ?? ""));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("oma-list");
      if (saved) setActive(saved);
    } catch {}
    load();
    const t = setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  useEffect(() => {
    try {
      if (active) localStorage.setItem("oma-list", active);
    } catch {}
  }, [active]);

  const add = async (raw: string) => {
    const texts = splitItems(raw);
    if (!texts.length || !active) return;
    setBusy(true);
    try {
      const created = await api<Item[]>("/api/items", { method: "POST", json: { listId: active, texts } });
      setItems((p) => [...p, ...created]);
      setText("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const speech = useSpeech((t) => add(t));

  const remove = async (id: string) => {
    setItems((p) => p.filter((i) => i.id !== id));
    await api(`/api/items/${id}`, { method: "DELETE" }).catch(load);
  };

  const toggle = async (it: Item) => {
    setItems((p) => p.map((i) => (i.id === it.id ? { ...i, bought: !i.bought } : i)));
    await api(`/api/items/${it.id}`, { method: "PATCH", json: { bought: !it.bought } }).catch(load);
  };

  const shown = items.filter((i) => i.listId === active);
  const open = shown.filter((i) => !i.bought);
  const done = shown.filter((i) => i.bought);
  const openCount = (id: string) => items.filter((i) => i.listId === id && !i.bought).length;

  return (
    <div className="stack">
      <div className="tabs">
        {lists.map((l) => (
          <button key={l.id} className={"tab" + (l.id === active ? " on" : "")} onClick={() => setActive(l.id)}>
            {l.name}
            {openCount(l.id) > 0 && <span className="badge">{openCount(l.id)}</span>}
          </button>
        ))}
        <button className="tab ghost" onClick={() => setManage((m) => !m)} aria-label="Listen bearbeiten">
          {manage ? "✕ Fertig" : "✎ Listen"}
        </button>
      </div>

      {manage && <ManageLists lists={lists} onChange={load} />}

      {error && <p className="error">{error}</p>}

      {active && <p className="section-label">Neu auf die Liste</p>}
      {active && (
        <form
          className="addbar"
          onSubmit={(e) => {
            e.preventDefault();
            add(text);
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="z. B. Brot"
            enterKeyHint="done"
            autoCapitalize="sentences"
          />
          <button className="btn primary" disabled={busy || !text.trim()} aria-label="Hinzufügen">
            +
          </button>
        </form>
      )}

      {speech.supported && active && (
        <button className={"mic" + (speech.listening ? " live" : "")} onClick={speech.toggle}>
          <span aria-hidden>{speech.listening ? "🔴" : "🎤"}</span>
          <span>
            {speech.listening ? "Ich höre zu …" : "Sprechen statt tippen"}
            <small>{speech.listening ? "Zum Beenden nochmal tippen" : "z. B. „Brot, Milch und Butter“"}</small>
          </span>
        </button>
      )}

      {active && (
        <p className="section-label">
          Auf der Liste{open.length ? ` · ${open.length}` : ""}
        </p>
      )}
      <ul className="items">
        {shown.length === 0 && <li className="empty">Diese Liste ist leer.</li>}
        {[...open, ...done].map((it) => (
          <li key={it.id} className={"item" + (it.bought ? " done" : "")}>
            {admin ? (
              <input type="checkbox" checked={it.bought} onChange={() => toggle(it)} className="check small" />
            ) : null}
            <span className="itext">
              <span className="name">{it.text}</span>
              {it.bought && <em className="tag">✓ gekauft</em>}
              {admin && Object.keys(it.translations ?? {}).length > 0 && (
                <small className="muted"> · {Object.entries(it.translations).map(([k, v]) => `${k}: ${v}`).join(" · ")}</small>
              )}
            </span>
            <button className="del" onClick={() => remove(it.id)} aria-label={`${it.text} löschen`}>
              {admin ? "✕" : "Löschen"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManageLists({ lists, onChange }: { lists: ShopList[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const rename = async (l: ShopList) => {
    const n = prompt("Neuer Name", l.name);
    if (n && n.trim()) {
      await api(`/api/lists/${l.id}`, { method: "PATCH", json: { name: n } });
      onChange();
    }
  };
  const del = async (l: ShopList) => {
    if (confirm(`Liste „${l.name}“ mit allen Einträgen löschen?`)) {
      await api(`/api/lists/${l.id}`, { method: "DELETE" });
      onChange();
    }
  };
  const move = async (l: ShopList, dir: -1 | 1) => {
    const idx = lists.findIndex((x) => x.id === l.id);
    const other = lists[idx + dir];
    if (!other) return;
    await Promise.all([
      api(`/api/lists/${l.id}`, { method: "PATCH", json: { order: idx + dir } }),
      api(`/api/lists/${other.id}`, { method: "PATCH", json: { order: idx } }),
    ]);
    onChange();
  };
  return (
    <div className="card">
      <h3>Listen bearbeiten</h3>
      <ul className="manage">
        {lists.map((l, i) => (
          <li key={l.id}>
            <span>{l.name}</span>
            <button onClick={() => move(l, -1)} disabled={i === 0} aria-label="nach oben">↑</button>
            <button onClick={() => move(l, 1)} disabled={i === lists.length - 1} aria-label="nach unten">↓</button>
            <button onClick={() => rename(l)}>Umbenennen</button>
            <button onClick={() => del(l)} className="danger">Löschen</button>
          </li>
        ))}
      </ul>
      <form
        className="addbar"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await api("/api/lists", { method: "POST", json: { name } });
          setName("");
          onChange();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Neue Liste, z. B. Apotheke" />
        <button className="btn primary" disabled={!name.trim()}>+</button>
      </form>
    </div>
  );
}
