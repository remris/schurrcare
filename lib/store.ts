// Minimaler Key-Value-Layer: Upstash Redis in Produktion, JSON-Datei lokal.
import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
import path from "path";

interface Store {
  hgetall(key: string): Promise<Record<string, string>>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<void>;
  hdel(key: string, ...fields: string[]): Promise<void>;
  lpush(key: string, value: string): Promise<void>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

function redisStore(): Store {
  const r = new Redis({ url: url!, token: token!, automaticDeserialization: false });
  return {
    async hgetall(k) {
      return ((await r.hgetall(k)) as Record<string, string> | null) ?? {};
    },
    async hget(k, f) {
      return ((await r.hget(k, f)) as string | null) ?? null;
    },
    async hset(k, f, v) {
      await r.hset(k, { [f]: v });
    },
    async hdel(k, ...f) {
      if (f.length) await r.hdel(k, ...f);
    },
    async lpush(k, v) {
      await r.lpush(k, v);
    },
    async lrange(k, s, e) {
      return ((await r.lrange(k, s, e)) as string[]) ?? [];
    },
    async get(k) {
      return ((await r.get(k)) as string | null) ?? null;
    },
    async set(k, v) {
      await r.set(k, v);
    },
  };
}

// Lokale Entwicklung: alles in .data/db.json
type FileDb = { h: Record<string, Record<string, string>>; l: Record<string, string[]>; s: Record<string, string> };
const file = path.join(process.cwd(), ".data", "db.json");
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<FileDb> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return { h: {}, l: {}, s: {} };
  }
}
async function save(db: FileDb) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(db));
}
function tx<T>(fn: (db: FileDb) => T): Promise<T> {
  const p = queue.then(async () => {
    const db = await load();
    const res = fn(db);
    await save(db);
    return res;
  });
  queue = p.catch(() => undefined);
  return p;
}

function fileStore(): Store {
  if (process.env.VERCEL) {
    throw new Error(
      "Keine Datenbank verbunden. Bitte in Vercel unter Storage eine Upstash-Redis-Datenbank mit dem Projekt verbinden und neu deployen."
    );
  }
  return {
    hgetall: (k) => tx((db) => ({ ...(db.h[k] ?? {}) })),
    hget: (k, f) => tx((db) => db.h[k]?.[f] ?? null),
    hset: (k, f, v) => tx((db) => void ((db.h[k] ??= {})[f] = v)),
    hdel: (k, ...f) => tx((db) => f.forEach((x) => delete db.h[k]?.[x])),
    lpush: (k, v) => tx((db) => void (db.l[k] ??= []).unshift(v)),
    lrange: (k, s, e) => tx((db) => (db.l[k] ?? []).slice(s, e === -1 ? undefined : e + 1)),
    get: (k) => tx((db) => db.s[k] ?? null),
    set: (k, v) => tx((db) => void (db.s[k] = v)),
  };
}

let cached: Store | null = null;
export function store(): Store {
  if (!cached) cached = url && token ? redisStore() : fileStore();
  return cached;
}
