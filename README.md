# MAP RESCUE AI — Google Business Profile Recovery

Private operations console for diagnosing suspended **Google Business Profile** listings, building verified evidence packs, and drafting reinstatement appeals.

All AI work runs through a single gateway: **OpenRouter**.

---

## What's inside

| Area | Route | Purpose |
| --- | --- | --- |
| Dashboard | `/` | KPIs, recent cases, live AI spend |
| Cases | `/customers` | Search / filter / open any case |
| New case | `/new-case` | 3-step intake wizard |
| Suspended | `/suspended` | Risk-ranked suspended listings |
| Appeals | `/appeals` | Bilingual appeal drafting (AR/EN) |
| Documents | `/documents` | Evidence upload + multimodal analysis |
| Tracker | `/tracker` | Status pipeline board |
| Reports | `/reports` | Performance + customer report generation |
| Google | `/google` | GBP OAuth 2.0 connection |
| **AI settings** | `/settings/ai` | Connection, models, routing, usage, history, errors, budget |
| System | `/settings` | Runtime mode, data controls, env reference |

## OpenRouter integration

```
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer $OPENROUTER_API_KEY
```

* `lib/ai/openrouter.ts` — the only place that talks to the provider (server-side `fetch`, no vendor SDK).
* `lib/ai/runner.ts` — model resolution, modality validation, automatic fallback, usage logging.
* `lib/ai/config.ts` — settings schema; models are changeable from the UI **without redeploying**.
* `lib/ai/storage.ts` — settings/usage persistence (`.data` JSON files, or Supabase when `AI_STORAGE=supabase`). The API key, when saved from the UI, is encrypted with **AES-256-GCM** and only its fingerprint is ever returned to the browser.
* `lib/ai/tasks.ts` — the eleven task definitions (prompts, output contracts, required modalities).

### Tasks routed through OpenRouter

Google Business Profile diagnosis · suspension investigation · Google policy analysis · document analysis · OCR text interpretation · evidence comparison · appeal generation · Arabic/English writing · recovery recommendations · case summaries · customer report generation.

### Multimodal correctness

Attachments are converted to OpenRouter content parts (`image_url`, `file`) and validated against the selected model's `input_modalities` **before** the request. If a model cannot read images or PDFs, the call fails fast with a clear message and a suggestion, instead of silently sending text only.

### API surface

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/ai/health` | GET | Mode, key source/fingerprint, settings |
| `/api/ai/settings` | GET / PUT | Read / update model routing & budgets |
| `/api/ai/key` | POST / DELETE | Save (verified) or remove the OpenRouter key |
| `/api/ai/models` | GET | Live catalogue with capabilities and pricing |
| `/api/ai/test` | POST | Key auth → model availability → live completion |
| `/api/ai/run` | POST | Run any task with attachments |
| `/api/ai/usage` | GET | Aggregated tokens, cost, latency, errors |
| `/api/diagnose` | POST | Backwards-compatible legacy diagnosis endpoint |

## Setup

```bash
npm install
cp .env.example .env.local
# set OPENROUTER_API_KEY (and AI_CONFIG_SECRET for key-at-rest encryption)
npm run dev
```

Then open `/settings/ai`, press **اختبار الاتصال** (test connection), and pick your default / fallback / vision models.

## Deployment

**Vercel / Node (recommended — key stays server-side):**

```bash
npm run build && npm start
```

Set `OPENROUTER_API_KEY`, `AI_CONFIG_SECRET`, and optionally `AI_STORAGE=supabase` + Supabase keys. Run `supabase/ai_schema.sql` first.

**GitHub Pages (static preview):**

```bash
npm run build:pages     # → ./out
```

The static build runs in *direct* mode: requests go from the browser to OpenRouter with a key stored in that browser only. It exists so the interface can be reviewed without a server; keep production on a server build.

## Operating rules (enforced by design)

* No automatic appeal submission — every external action is manual and owner-approved.
* No invented suspension reasons: the prompts require official policy grounding and explicit `insufficient_evidence` when data is missing.
* Every AI call is logged with model, tokens, cost, latency and status.
* The API key is never returned to the client in server mode.

## Official sources

* https://support.google.com/business
* https://developers.google.com/my-business
* https://developers.google.com/my-business/content/prereqs
* https://openrouter.ai/docs
