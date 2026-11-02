// Übersetzung Deutsch -> Zielsprache.
// 1. DeepL (wenn DEEPL_API_KEY gesetzt, kostenlos bis 500k Zeichen/Monat)
// 2. sonst kostenloser Google-Translate-Endpunkt (ohne Key)
// 3. sonst MyMemory (kostenlos, ohne Key)
import { cacheTranslation, cachedTranslation } from "./data";

async function deepl(text: string, lang: string): Promise<string | null> {
  const key = process.env.DEEPL_API_KEY;
  if (!key) return null;
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const target = lang === "en" ? "EN-GB" : lang === "pt" ? "PT-PT" : lang.toUpperCase();
  const res = await fetch(`https://${host}/v2/translate`, {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: [text], source_lang: "DE", target_lang: target }),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j?.translations?.[0]?.text ?? null;
}

async function google(text: string, lang: string): Promise<string | null> {
  const u = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=${encodeURIComponent(
    lang
  )}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return null;
  const j = await res.json();
  const out = (j?.[0] ?? []).map((p: unknown[]) => p?.[0] ?? "").join("");
  return out || null;
}

async function mymemory(text: string, lang: string): Promise<string | null> {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=de|${encodeURIComponent(lang)}`
  );
  if (!res.ok) return null;
  const j = await res.json();
  const t = j?.responseData?.translatedText;
  return typeof t === "string" && !/MYMEMORY WARNING/i.test(t) ? t : null;
}

export async function translate(text: string, lang: string): Promise<string | null> {
  if (!text.trim() || lang === "de") return text;
  const hit = await cachedTranslation(lang, text);
  if (hit) return hit;
  for (const fn of [deepl, google, mymemory]) {
    try {
      const t = await fn(text, lang);
      if (t) {
        await cacheTranslation(lang, text, t);
        return t;
      }
    } catch {
      /* nächster Anbieter */
    }
  }
  return null;
}
