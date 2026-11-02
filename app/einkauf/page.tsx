"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { LANGUAGES, detectLang, t as T } from "@/lib/languages";
import { matchReceipt, productLines } from "@/lib/match";
import type { Item, ReceiptMatch, ShopList } from "@/lib/types";

type Receipt = { method: "tesseract" | "claude"; lines: string[]; matches: ReceiptMatch[]; total?: string; image: string };

export default function Einkauf() {
  const [lang, setLang] = useState("");
  const [lists, setLists] = useState<ShopList[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState("");
  const [finish, setFinish] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let l = "";
    try {
      l = localStorage.getItem("lang") || "";
    } catch {}
    setLang(l || detectLang());
  }, []);

  const load = useCallback(async () => {
    if (!lang) return;
    try {
      const d = await api<{ lists: ShopList[]; items: Item[] }>(`/api/lists?lang=${lang}`);
      setLists(d.lists);
      setItems(d.items);
      setActive((a) => {
        if (d.lists.some((l) => l.id === a)) return a;
        // erste Liste, auf der etwas steht
        const withItems = d.lists.find((l) => d.items.some((i) => i.listId === l.id));
        return (withItems ?? d.lists[0])?.id ?? "";
      });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [lang]);

  useEffect(() => {
    if (!lang) return;
    try {
      localStorage.setItem("lang", lang);
    } catch {}
    document.documentElement.lang = lang;
    load();
    const iv = setInterval(() => !finish && load(), 10000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
    };
  }, [lang, load, finish]);

  const s = T(lang);
  const shown = items.filter((i) => i.listId === active);
  const label = (i: Item) => (lang === "de" ? i.text : i.translations?.[lang] || i.text);

  const toggle = async (it: Item, value = !it.bought) => {
    setItems((p) => p.map((i) => (i.id === it.id ? { ...i, bought: value } : i)));
    await api(`/api/items/${it.id}`, { method: "PATCH", json: { bought: value } }).catch(load);
  };

  const boughtCount = shown.filter((i) => i.bought).length;

  if (!lang) return null;
  return (
    <main className="page pflege">
      <header className="top">
        <h1>🛒 {s.title}</h1>
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={s.language}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </header>

      <div className="tabs">
        {lists.map((l) => {
          const n = items.filter((i) => i.listId === l.id && !i.bought).length;
          return (
            <button key={l.id} className={"tab" + (l.id === active ? " on" : "")} onClick={() => setActive(l.id)}>
              {l.name}
              {n > 0 && <span className="badge">{n}</span>}
            </button>
          );
        })}
      </div>

      {error && <p className="error">{error}</p>}

      <ul className="items">
        {shown.length === 0 && <li className="empty">{s.empty}</li>}
        {shown.map((it) => (
          <li key={it.id} className={"item tap" + (it.bought ? " done" : "")} onClick={() => toggle(it)}>
            <span className={"check" + (it.bought ? " on" : "")}>{it.bought ? "✓" : ""}</span>
            <span className="itext">
              <b>{label(it)}</b>
              {lang !== "de" && label(it) !== it.text && <span className="de"> / {it.text}</span>}
            </span>
          </li>
        ))}
      </ul>

      {shown.length > 0 && (
        <button
          className="btn primary block sticky"
          onClick={() => (boughtCount ? setFinish(true) : setToast(s.nothingChecked))}
        >
          {s.done} ({boughtCount}/{shown.length})
        </button>
      )}

      {finish && (
        <FinishDialog
          lang={lang}
          listId={active}
          items={shown}
          label={label}
          onToggle={toggle}
          onClose={(saved) => {
            setFinish(false);
            if (saved) {
              setToast(s.saved);
              load();
            }
          }}
        />
      )}
      {toast && <Toast text={toast} onDone={() => setToast("")} />}
    </main>
  );
}

function FinishDialog({
  lang,
  listId,
  items,
  label,
  onToggle,
  onClose,
}: {
  lang: string;
  listId: string;
  items: Item[];
  label: (i: Item) => string;
  onToggle: (i: Item, v: boolean) => Promise<void>;
  onClose: (saved: boolean) => void;
}) {
  const s = T(lang);
  const [step, setStep] = useState<"choose" | "reading" | "review">("choose");
  const [progress, setProgress] = useState(0);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const onFile = async (file: File) => {
    setErr("");
    setStep("reading");
    setProgress(0);
    try {
      const big = await resizeImage(file, 1800, 0.85, true);
      const small = await resizeImage(file, 1000, 0.6, false);
      const list = items.map((i) => ({ id: i.id, text: i.text }));
      let r: Receipt | null = null;

      // 1) Claude (nur wenn auf dem Server ein Key hinterlegt ist)
      try {
        const res = await api<any>("/api/receipt", { method: "POST", json: { image: big, items: list } });
        if (res.available) r = { method: "claude", lines: res.lines, matches: res.matches, total: res.total, image: small };
      } catch {}

      // 2) kostenlos im Handy: Tesseract OCR
      if (!r) {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("deu", 1, {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
          },
        });
        const { data } = await worker.recognize(big);
        await worker.terminate();
        const lines = productLines(data.text);
        const total = data.text.match(/(?:summe|gesamt|total)[^\d]*(\d+[.,]\d{2})/i)?.[1];
        r = { method: "tesseract", lines, matches: matchReceipt(list, lines), total: total ? total + " €" : undefined, image: small };
      }
      setReceipt(r);
      setStep("review");
    } catch (e) {
      console.error(e);
      setErr(s.scanFailed);
      setStep("choose");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/trips", {
        method: "POST",
        json: {
          listId,
          lang,
          image: receipt?.image,
          receipt: receipt ? { method: receipt.method, lines: receipt.lines, matches: receipt.matches, total: receipt.total } : undefined,
        },
      });
      onClose(true);
    } catch (e) {
      setErr((e as Error).message);
      setSaving(false);
    }
  };

  const byId = useMemo(() => new Map<string, ReceiptMatch>((receipt?.matches ?? []).map((m) => [m.itemId, m])), [receipt]);
  const checked = items.filter((i) => i.bought);
  const ok = checked.filter((i) => byId.get(i.id)?.found);
  const missing = checked.filter((i) => !byId.get(i.id)?.found);
  const suggest = items.filter((i) => !i.bought && byId.get(i.id)?.found);

  return (
    <div className="overlay" onClick={() => !saving && step !== "reading" && onClose(false)}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>
          {s.done} · {checked.length} {s.boughtCount}
        </h2>

        {step === "choose" && (
          <div className="stack">
            <label className="btn primary block">
              {s.scan}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </label>
            <button className="btn block" onClick={save} disabled={saving}>
              {s.saveNoReceipt}
            </button>
            {err && <p className="error">{err}</p>}
            <button className="btn ghost block" onClick={() => onClose(false)}>
              {s.cancel}
            </button>
          </div>
        )}

        {step === "reading" && (
          <div className="stack center">
            <div className="spinner" />
            <p>
              {s.reading} {progress > 0 && `${progress}%`}
            </p>
          </div>
        )}

        {step === "review" && receipt && (
          <div className="stack">
            {ok.length > 0 && (
              <section>
                <h3>✅ {s.found}</h3>
                <ul className="plain">
                  {ok.map((i) => (
                    <li key={i.id}>
                      {label(i)} <span className="de">/ {i.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {missing.length > 0 && (
              <section>
                <h3>❓ {s.notFound}</h3>
                <ul className="plain">
                  {missing.map((i) => (
                    <li key={i.id}>
                      {label(i)} <span className="de">/ {i.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {suggest.length > 0 && (
              <section>
                <h3>➕ {s.suggest}</h3>
                <ul className="plain">
                  {suggest.map((i) => (
                    <li key={i.id}>
                      <button className="btn small" onClick={() => onToggle(i, true)}>
                        ✓ {label(i)} <span className="de">/ {i.text}</span>
                      </button>
                      <span className="muted"> „{byId.get(i.id)?.line}“</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {receipt.total && <p className="muted">Σ {receipt.total}</p>}
            {err && <p className="error">{err}</p>}
            <button className="btn primary block" onClick={save} disabled={saving}>
              {saving ? "…" : s.save}
            </button>
            <button className="btn ghost block" onClick={() => setStep("choose")} disabled={saving}>
              {s.cancel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="toast">{text}</div>;
}

/** Bild verkleinern (und optional für OCR in Graustufen + mehr Kontrast) */
async function resizeImage(file: File, max: number, quality: number, enhance: boolean): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d")!;
    if (enhance) ctx.filter = "grayscale(1) contrast(1.4)";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
