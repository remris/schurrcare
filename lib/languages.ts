export const LANGUAGES: { code: string; name: string }[] = [
  { code: "uk", name: "Українська" },
  { code: "ru", name: "Русский" },
  { code: "pl", name: "Polski" },
  { code: "ro", name: "Română" },
  { code: "bg", name: "Български" },
  { code: "hr", name: "Hrvatski" },
  { code: "sr", name: "Srpski" },
  { code: "bs", name: "Bosanski" },
  { code: "cs", name: "Čeština" },
  { code: "sk", name: "Slovenčina" },
  { code: "hu", name: "Magyar" },
  { code: "lt", name: "Lietuvių" },
  { code: "lv", name: "Latviešu" },
  { code: "sq", name: "Shqip" },
  { code: "tr", name: "Türkçe" },
  { code: "el", name: "Ελληνικά" },
  { code: "it", name: "Italiano" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
];

export function detectLang(): string {
  if (typeof navigator === "undefined") return "uk";
  for (const l of navigator.languages ?? [navigator.language]) {
    const c = l.toLowerCase().split("-")[0];
    if (LANGUAGES.some((x) => x.code === c)) return c;
  }
  return "en";
}

type Strings = {
  title: string;
  empty: string;
  done: string;
  scan: string;
  saveNoReceipt: string;
  save: string;
  cancel: string;
  reading: string;
  found: string;
  notFound: string;
  suggest: string;
  boughtCount: string;
  language: string;
  saved: string;
  nothingChecked: string;
  scanFailed: string;
};

const S: Record<string, Strings> = {
  de: {
    title: "Einkaufen",
    empty: "Nichts zu kaufen 🎉",
    done: "Einkauf fertig",
    scan: "📷 Kassenzettel fotografieren",
    saveNoReceipt: "Ohne Kassenzettel speichern",
    save: "Speichern",
    cancel: "Abbrechen",
    reading: "Kassenzettel wird gelesen…",
    found: "Auf dem Kassenzettel",
    notFound: "Abgehakt, aber nicht auf dem Zettel gefunden",
    suggest: "Auf dem Zettel gefunden, aber nicht abgehakt – abhaken?",
    boughtCount: "gekauft",
    language: "Sprache",
    saved: "Gespeichert ✔",
    nothingChecked: "Bitte zuerst gekaufte Sachen abhaken.",
    scanFailed: "Zettel konnte nicht gelesen werden.",
  },
  uk: {
    title: "Покупки",
    empty: "Нічого купувати 🎉",
    done: "Покупки завершено",
    scan: "📷 Сфотографувати чек",
    saveNoReceipt: "Зберегти без чека",
    save: "Зберегти",
    cancel: "Скасувати",
    reading: "Читаю чек…",
    found: "Є в чеку",
    notFound: "Відмічено, але не знайдено в чеку",
    suggest: "Знайдено в чеку, але не відмічено – відмітити?",
    boughtCount: "куплено",
    language: "Мова",
    saved: "Збережено ✔",
    nothingChecked: "Спочатку відмітьте куплені товари.",
    scanFailed: "Не вдалося прочитати чек.",
  },
  ru: {
    title: "Покупки",
    empty: "Ничего покупать не нужно 🎉",
    done: "Покупки завершены",
    scan: "📷 Сфотографировать чек",
    saveNoReceipt: "Сохранить без чека",
    save: "Сохранить",
    cancel: "Отмена",
    reading: "Читаю чек…",
    found: "Есть в чеке",
    notFound: "Отмечено, но не найдено в чеке",
    suggest: "Найдено в чеке, но не отмечено – отметить?",
    boughtCount: "куплено",
    language: "Язык",
    saved: "Сохранено ✔",
    nothingChecked: "Сначала отметьте купленные товары.",
    scanFailed: "Не удалось прочитать чек.",
  },
  pl: {
    title: "Zakupy",
    empty: "Nic do kupienia 🎉",
    done: "Zakupy zakończone",
    scan: "📷 Zrób zdjęcie paragonu",
    saveNoReceipt: "Zapisz bez paragonu",
    save: "Zapisz",
    cancel: "Anuluj",
    reading: "Czytam paragon…",
    found: "Na paragonie",
    notFound: "Zaznaczone, ale nie znalezione na paragonie",
    suggest: "Znalezione na paragonie, ale nie zaznaczone – zaznaczyć?",
    boughtCount: "kupione",
    language: "Język",
    saved: "Zapisano ✔",
    nothingChecked: "Najpierw zaznacz kupione rzeczy.",
    scanFailed: "Nie udało się odczytać paragonu.",
  },
  ro: {
    title: "Cumpărături",
    empty: "Nimic de cumpărat 🎉",
    done: "Cumpărături terminate",
    scan: "📷 Fotografiază bonul",
    saveNoReceipt: "Salvează fără bon",
    save: "Salvează",
    cancel: "Anulează",
    reading: "Citesc bonul…",
    found: "Pe bon",
    notFound: "Bifat, dar negăsit pe bon",
    suggest: "Găsit pe bon, dar nebifat – bifez?",
    boughtCount: "cumpărate",
    language: "Limba",
    saved: "Salvat ✔",
    nothingChecked: "Bifează mai întâi produsele cumpărate.",
    scanFailed: "Bonul nu a putut fi citit.",
  },
  en: {
    title: "Shopping",
    empty: "Nothing to buy 🎉",
    done: "Shopping done",
    scan: "📷 Photograph receipt",
    saveNoReceipt: "Save without receipt",
    save: "Save",
    cancel: "Cancel",
    reading: "Reading receipt…",
    found: "On the receipt",
    notFound: "Checked, but not found on receipt",
    suggest: "Found on receipt but not checked – check it?",
    boughtCount: "bought",
    language: "Language",
    saved: "Saved ✔",
    nothingChecked: "Please check the bought items first.",
    scanFailed: "Could not read the receipt.",
  },
};

export const t = (lang: string): Strings => S[lang] ?? S.en;
