import { store } from "./store";
import type { Doc, HelpEntry, Item, ShopList, Trip } from "./types";

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const parse = <T>(v: string | null | undefined): T | null => {
  if (v == null) return null;
  try {
    return (typeof v === "string" ? JSON.parse(v) : v) as T;
  } catch {
    return null;
  }
};

const DEFAULT_LISTS = ["Edeka", "Bäcker", "Kaufland"];

export async function getLists(): Promise<ShopList[]> {
  const raw = await store().hgetall("lists");
  let lists = Object.values(raw).map((v) => parse<ShopList>(v)!).filter(Boolean);
  if (lists.length === 0 && !(await store().get("seeded"))) {
    await store().set("seeded", "1");
    lists = [];
    for (const [i, name] of DEFAULT_LISTS.entries()) {
      const l: ShopList = { id: newId() + i, name, order: i, createdAt: new Date().toISOString() };
      await saveList(l);
      lists.push(l);
    }
  }
  return lists.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}
export async function getList(id: string) {
  return parse<ShopList>(await store().hget("lists", id));
}
export async function saveList(l: ShopList) {
  await store().hset("lists", l.id, JSON.stringify(l));
}
export async function deleteList(id: string) {
  const items = (await getItems()).filter((i) => i.listId === id);
  await store().hdel("items", ...items.map((i) => i.id));
  await store().hdel("lists", id);
}

export async function getItems(): Promise<Item[]> {
  const raw = await store().hgetall("items");
  return Object.values(raw)
    .map((v) => parse<Item>(v)!)
    .filter(Boolean)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function getItem(id: string) {
  return parse<Item>(await store().hget("items", id));
}
export async function saveItem(i: Item) {
  await store().hset("items", i.id, JSON.stringify(i));
}
export async function deleteItems(ids: string[]) {
  await store().hdel("items", ...ids);
}

export async function addTrip(t: Trip, receiptImage?: string) {
  if (receiptImage) await store().set("receipt:" + t.id, receiptImage);
  await store().lpush("trips", JSON.stringify(t));
}
export async function getTrips(limit = 200): Promise<Trip[]> {
  const raw = await store().lrange("trips", 0, limit - 1);
  return raw.map((v) => parse<Trip>(v)!).filter(Boolean);
}
export async function getReceiptImage(tripId: string) {
  return store().get("receipt:" + tripId);
}

// Übersetzungs-Cache (gleiche Begriffe wie "Milch" nur einmal übersetzen)
export async function cachedTranslation(lang: string, text: string) {
  return store().hget("tr:" + lang, text.trim().toLowerCase());
}
export async function cacheTranslation(lang: string, text: string, tr: string) {
  await store().hset("tr:" + lang, text.trim().toLowerCase(), tr);
}

// Hilfe-Texte für die Pflegerin
export async function getHelp(): Promise<HelpEntry[]> {
  const raw = await store().hgetall("help");
  return Object.values(raw)
    .map((v) => parse<HelpEntry>(v)!)
    .filter(Boolean)
    .sort((a, b) => a.order - b.order || a.updatedAt.localeCompare(b.updatedAt));
}
export async function getHelpEntry(id: string) {
  return parse<HelpEntry>(await store().hget("help", id));
}
export async function saveHelp(h: HelpEntry) {
  await store().hset("help", h.id, JSON.stringify(h));
}
export async function deleteHelp(id: string) {
  await store().hdel("help", id);
}

// Verträge / Dokumente (nur Admin). Metadaten im Hash "docs", jede Seite einzeln unter "docpage:<id>".
export async function getDocs(): Promise<Doc[]> {
  const raw = await store().hgetall("docs");
  return Object.values(raw)
    .map((v) => parse<Doc>(v)!)
    .filter(Boolean)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function getDoc(id: string) {
  return parse<Doc>(await store().hget("docs", id));
}
export async function saveDoc(d: Doc) {
  await store().hset("docs", d.id, JSON.stringify(d));
}
export async function deleteDoc(d: Doc) {
  for (const p of d.pages) await store().del("docpage:" + p.id);
  await store().hdel("docs", d.id);
}
export async function getDocPage(pageId: string) {
  return store().get("docpage:" + pageId);
}
export async function saveDocPage(pageId: string, dataUrl: string) {
  await store().set("docpage:" + pageId, dataUrl);
}
export async function deleteDocPage(pageId: string) {
  await store().del("docpage:" + pageId);
}
