// Vergleicht OCR-Zeilen eines Kassenzettels mit den Einträgen der Liste.
// Kassenzettel kürzen stark ab ("MISCHBR.", "H-MILCH 3,5%"), daher Präfix- und Ähnlichkeitsvergleich.

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set(["und", "oder", "der", "die", "das", "ein", "eine", "fuer", "mit", "von", "stk", "stueck", "pack", "packung", "kg", "g", "l", "ml", "bitte", "x"]);

const words = (s: string) => norm(s).split(" ").filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));

function lev(a: string, b: string) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[n];
}

function wordScore(itemWord: string, receiptWord: string) {
  if (itemWord === receiptWord) return 1;
  // Abkürzung auf dem Zettel: "mischbr" -> "mischbrot"
  if (receiptWord.length >= 4 && itemWord.startsWith(receiptWord)) return 0.9;
  if (itemWord.length >= 4 && receiptWord.startsWith(itemWord)) return 0.85; // "milch" -> "milchreis" / "hmilch"
  if (itemWord.length >= 4 && receiptWord.includes(itemWord)) return 0.8; // "vollmilch" enthält "milch"
  const l = Math.max(itemWord.length, receiptWord.length);
  return 1 - lev(itemWord, receiptWord) / l;
}

export function lineScore(item: string, line: string) {
  const iw = words(item);
  const lw = words(line).concat(norm(line).replace(/ /g, "").length >= 4 ? [norm(line).replace(/ /g, "")] : []);
  if (!iw.length || !lw.length) return 0;
  let best = 0;
  for (const a of iw) for (const b of lw) best = Math.max(best, wordScore(a, b));
  return best;
}

/** Liefert für jeden Eintrag die beste passende Zeile (oder null). */
export function matchReceipt(items: { id: string; text: string }[], lines: string[], threshold = 0.78) {
  const clean = lines.map((l) => l.trim()).filter((l) => l.length >= 3);
  return items.map((it) => {
    let best = { score: 0, line: "" };
    for (const l of clean) {
      const s = lineScore(it.text, l);
      if (s > best.score) best = { score: s, line: l };
    }
    return { itemId: it.id, text: it.text, found: best.score >= threshold, line: best.score >= threshold ? best.line : undefined };
  });
}

/** Grobe Filterung: Zeilen, die nach Produkten aussehen (Text + Preis). */
export function productLines(ocr: string) {
  return ocr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /[a-zA-ZäöüÄÖÜ]{3,}/.test(l))
    .filter((l) => !/(summe|gesamt|total|bar|ec[- ]?karte|mwst|ust|netto|brutto|rückgeld|rueckgeld|kasse|bon|datum|uhrzeit|vielen dank|steuer|zahlung|terminal|beleg|kartenzahlung|girocard|visa|mastercard)/i.test(l));
}
