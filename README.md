# 🧺 Einkaufsliste für Oma & Pflegerin

Next.js-App (PWA) für Vercel:

- **Oma** (`/oma`): Listen (z. B. Edeka, Bäcker, Kaufland) – Einträge per Tippen oder 🎤 Sprache
  („Brot, Milch und Butter“ wird zu drei Einträgen). Listen anlegen/umbenennen/löschen über ✎.
- **Pflegerin** (`/einkauf`): sieht alles in ihrer Sprache, z. B. **Хліб** / Brot. Sprache wird vom Handy erkannt
  und ist oben umstellbar. Antippen = abhaken. „Einkauf fertig“ → Kassenzettel fotografieren → Abgleich:
  ✅ auf dem Zettel · ❓ abgehakt aber nicht gefunden · ➕ auf dem Zettel aber nicht abgehakt.
- **Admin** (`/admin`): Listen & Einträge bearbeiten, Historie aller Einkäufe mit Kassenzettel-Foto, Suche, CSV-Export,
  Tab **Hilfe**: Hinweise für die Pflegerin schreiben (mit Übersetzungs-Vorschau).
  Tab **Vertrag**: Vertragsseiten fotografieren oder als Bild/PDF hochladen (max. 3 MB pro Datei), ansehen, sortieren, herunterladen.
- **Hilfe für die Pflegerin** (`/einkauf/hilfe`, ℹ️-Knopf): alle Hinweise übersetzt in ihre Sprache, deutsches Original aufklappbar.

## Was kostet was?

| Funktion | Lösung | Kosten |
|---|---|---|
| Hosting | Vercel Hobby | kostenlos |
| Datenbank | Upstash Redis (über Vercel Marketplace) | kostenlos (Free-Tier reicht locker) |
| Spracheingabe | im Handy-Browser eingebaut (Chrome/Android, Safari/iOS) | kostenlos |
| Übersetzung | Google-Translate-Endpunkt ohne Key, Ergebnisse werden gespeichert. Optional DeepL Free (bessere Qualität) | kostenlos |
| Kassenzettel lesen | Tesseract direkt im Handy | kostenlos |
| Kassenzettel lesen (besser) | optional Claude per `ANTHROPIC_API_KEY` | ca. 1 Cent/Zettel |

> Tesseract liest Kassenzettel brauchbar, aber nicht perfekt (Knicke, Thermopapier, starke Abkürzungen).
> Die Zuordnung „MISCHBROT“ → Brot, „H-MILCH“ → Milch klappt; bei schwierigen Zetteln landet ein Artikel
> eben unter ❓. Mit Claude-Key ist die Erkennung deutlich zuverlässiger.

## Deploy auf Vercel (ca. 10 Minuten)

1. Ordner in ein GitHub-Repo pushen:
   ```bash
   git init && git add . && git commit -m "Einkaufsliste"
   gh repo create schnurrcare --private --source=. --push
   ```
2. Auf [vercel.com/new](https://vercel.com/new) das Repo importieren (Framework: Next.js wird erkannt).
3. Unter **Settings → Environment Variables** setzen:
   - `OMA_CODE` – Code nur für Oma (z. B. `oma-sonnenblume`)
   - `PFLEGE_CODE` – Code nur für die Pflegerin (z. B. `pflege-apfelbaum`), muss anders sein als `OMA_CODE`
   - `ADMIN_PASSWORD` – Passwort für `/admin`
   - `AUTH_SECRET` – beliebiger langer Zufallstext
   - optional `DEEPL_API_KEY`, `ANTHROPIC_API_KEY`
4. **Storage → Create Database → Upstash for Redis** (Free) → mit dem Projekt verbinden.
   Vercel setzt `KV_REST_API_URL`/`KV_REST_API_TOKEN` automatisch.
5. **Redeploy** (Deployments → ⋯ → Redeploy), damit die Variablen greifen.

## Auf die Handys bringen

Jede bekommt ihren eigenen Link:

- Oma: `https://DEINE-APP.vercel.app/login?code=OMA_CODE`
- Pflegerin: `https://DEINE-APP.vercel.app/login?code=PFLEGE_CODE`

Jede landet automatisch nur in ihrem Bereich und kommt nicht in die anderen:

| | Oma | Pflegerin | Admin |
|---|---|---|---|
| Einträge/Listen anlegen, ändern, löschen | ✅ | – | ✅ |
| Abhaken, Kassenzettel, Einkauf abschließen | – | ✅ | ✅ |
| Hilfe lesen | – | ✅ | ✅ |
| Historie, Hilfe bearbeiten | – | – | ✅ |

- **Android/Chrome:** Menü ⋮ → „App installieren“ / „Zum Startbildschirm hinzufügen“
- **iPhone/Safari:** Teilen-Symbol → „Zum Home-Bildschirm“

Der Login bleibt ca. ein Jahr gültig.

## Lokal starten

```bash
npm install
cp .env.example .env.local   # Werte anpassen
npm run dev
```
Ohne Redis-Variablen speichert die App lokal in `.data/db.json`.
Spracheingabe und Kamera brauchen HTTPS – auf dem Handy also erst nach dem Deploy testen.

## Aufbau

```
app/oma          Omas Ansicht (components/ListEditor.tsx)
app/einkauf      Pflegerin: Übersetzung, Abhaken, Kassenzettel-Scan
app/admin        Listen + Historie
app/api/*        Listen, Einträge, Einkäufe (trips), Kassenzettel (Claude optional), Login
lib/translate.ts DeepL → Google → MyMemory, mit Cache
lib/match.ts     Abgleich Kassenzettel-Zeilen ↔ Listeneinträge
lib/store.ts     Upstash Redis bzw. lokale JSON-Datei
```
