# Omni Health — Hospital Discovery Platform

**Omni Health** is a hospital-discovery platform built as a 2-day hackathon MVP. Patients describe what they need in plain English — *"kidney treatment near Chandigarh under 2 lakh"* — and the platform finds, ranks, and compares the right hospitals for that **specific disease**, within budget.

🔗 **Live demo:** [https://omni-health-app.vercel.app](https://omni-health-app.vercel.app)

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite (JSX, jsdom tests) |
| Backend | Node.js + Express (ES modules) |
| Shared logic | One parser, one ranking engine, one medical classifier — used by **both** sides (`shared/`) |
| Hosting | Vercel — frontend (static) **and** backend (serverless function) on a single URL |
| Data | `hospitals_seed.json` — 55 synthetic hospital records |

---

## Live Demo

Everything below runs on the deployed site — no setup needed:

- **Natural-language search** — type a query or tap a suggestion chip.
- **AI assistant (bot)** — a 3-step wizard: condition → patient age → budget, ending in ranked hospital cards with *Compare* and *Call Consult* actions.
- **Patient Reviews** — expand any hospital card for a compact review profile.
- **Compare Matrix** — select up to 3 hospitals for a side-by-side table.

> All hospital data, ratings, costs, and review percentages are **synthetic demo data** (see [Simulated vs Real](#simulated-vs-real)).

---

## Quick Start (Local Development)

**1. Backend** — runs on `http://localhost:3001`:

```bash
cd backend
npm install
npm start
```

**2. Frontend** — runs on `http://localhost:5173` (requires the backend):

```bash
cd frontend
npm install
npm run dev
```

The frontend calls the backend through a same-origin `/api` prefix. In local dev the Vite dev server proxies `/api/*` → `http://localhost:3001/*` (prefix stripped); in production the same `/api/*` path is handled by a Vercel serverless function. No configuration switch needed — it just works in both places.

**3. Tests:**

```bash
cd backend  && npm test    # 43 tests — API, classifier, NL gate, ranking, CRUD
cd frontend && npm test    #  8 tests — app shell, auth, admin gating
```

---

## Features

### 1. Medical-only search (hard gate)

Every natural-language query is classified **before** any hospital list is built:

- **Medical queries** (illness, transplant, checkup, injury, emergency, treatment) are parsed into structured filters.
- **Non-medical queries** — *"paneer tikka"*, *"chicken biryani"*, *"hospital food menu"*, *"cold coffee"* — are **blocked**: the API returns `category: "non_medical"` with **zero hospitals**, and the UI replaces the entire results grid with a blocked screen (it never falls through to "all 55 hospitals").
- **`hair transplant` is medical** — mapped to dermatology — so *"best hair transplant in Delhi"* correctly surfaces AIIMS New Delhi and Max Super Speciality Saket.
- **False-positive guards** — bare ambiguous words like `cold` (as in *cold coffee*) are intentionally not matched as diseases; word-boundary matching prevents accidental hits.

### 2. Per-disease hospital ranking

Results are ranked by **specialty relevance**, not just star rating:

| Relevance | Criteria | Example |
|-----------|----------|---------|
| 1.0 | Disease named in the hospital name | *Chandigarh Kidney & Nephrology Institute* for kidney |
| 0.9 | Dedicated facility for the disease (e.g. Cath Lab for cardiac) | *PGIMER*, *Fortis Escorts* for cardiac |
| 0.6 | Exact specialty tag match | tagged multispecialty hospitals |

This is why different diseases surface **different** top hospitals — kidney → Chandigarh Kidney Institute, cardiac → PGIMER/Escorts, cancer → Bathinda Cancer Institute — instead of one generic "best-rated" list. Ties inside a tier break by rating, then patient volume.

### 3. Natural-language query parsing

The parser (`shared/nlParser.js`) extracts **disease, location, budget, and priority** from free text. Budgets understand Indian formats ("2 lakh", "₹500000").

Working examples:

- `kidney treatment near Chandigarh under 2 lakh` → 2 hospitals
- `heart surgery in Delhi under ₹500000`
- `knee replacement Mumbai 3 lakh budget`
- `best hair transplant in Delhi` → dermatology hospitals
- `emergency neurology treatment in Hyderabad`

Blocked examples (return **no** hospitals, by design):

- `paneer tikka near me` · `chicken biryani` · `hospital food menu` · `cold coffee near me`

### 4. Compare up to 3 hospitals

Select hospitals from the grid and open **Compare Matrix**: rating, location, specialties, cost range, facilities, bed count, accreditation, and annual patient volume — side by side in one table.

### 5. Patient Reviews (hospital profile)

Every hospital card has a **Patient Reviews** toggle that expands a compact profile: horizontal ten-block bars (each block ≈ 10%), aligned labels, and percentage values — staff behaviour, doctor communication, treatment satisfaction, cleanliness, comfort & care, waiting experience, plus an overall-experience block.

- Bars are 4px thin with minimal vertical spacing (compact design).
- **Every hospital gets different numbers** — values are generated deterministically from the hospital's identity (seeded PRNG), and hospitals rated ≥ 4.8★ sit in a higher band, so the figures stay plausible next to the star rating.
- **Clearly marked sample data** — a badge and an in-section disclaimer state that these are illustrative percentages, not real survey results. This project never presents fabricated numbers as real statistics.

### 6. Demo authentication & admin

- Client-side demo auth (any email/password "logs in"; roles are self-selected).
- The **Admin Management** page is gated behind a login and offers record create/edit/delete.
- See [Known Limitations](#known-limitations) for why this is demo-only.

---

## API Endpoints

Base URL in production: `https://omni-health-app.vercel.app/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check → `{"status":"ok"}` |
| GET | `/hospitals` | List all hospitals |
| GET | `/hospitals/:id` | Single hospital (numeric ID; 400 for non-numeric, 404 for missing) |
| GET | `/hospitals/search?disease=&city=&state=&budget_max=` | Structured filter search, ranked by specialty relevance |
| POST | `/search/nl` | Natural-language search `{ "query": "..." }` → medical results **or** `non_medical` block with `hospitals: []` |
| POST | `/search/classify` | Medical gate `{ "query": "..." }` → `{ category, reason, isMedical }` |
| POST | `/hospitals` | Create hospital (`name` + `city` required; unknown fields stripped) |
| PUT | `/hospitals/:id` | Update hospital |
| DELETE | `/hospitals/:id` | Delete hospital (204) |

**Example — medical:**

```bash
curl -X POST https://omni-health-app.vercel.app/api/search/nl \
  -H "Content-Type: application/json" \
  -d '{"query":"kidney treatment near Chandigarh under 2 lakh"}'
# → { "category": "medical", "hospitals": [ ... ] }
```

**Example — blocked:**

```bash
curl -X POST https://omni-health-app.vercel.app/api/search/nl \
  -H "Content-Type: application/json" \
  -d '{"query":"paneer tikka recipe"}'
# → { "category": "non_medical", "message": "...", "hospitals": [] }
```

---

## Data Model (Hospital Record)

```json
{
  "id": 1,
  "name": "Fortis Hospital Mohali",
  "city": "Mohali",
  "state": "Punjab",
  "pincode": "160062",
  "lat": 30.7046,
  "long": 76.7179,
  "specialties": ["cardiac", "orthopedic", "neurology"],
  "cost_estimate_min": 80000,
  "cost_estimate_max": 350000,
  "facilities": ["ICU", "Cath Lab", "Private Rooms", "24x7 Emergency"],
  "bed_count": 350,
  "accreditation_status": "NABH Accredited",
  "patient_volume": 45000,
  "rating": 4.8
}
```

IDs are **numbers everywhere** (seed file, API, frontend). The dataset ships in `hospitals_seed.json` (55 records); tests run against an isolated temp copy and never mutate the seed.

---

## How a Search Flows Through the System

```
User query
   │
   ▼
medicalClassifier.js ── non-medical ──►  { category: "non_medical", hospitals: [] }
   │ medical                                     (UI shows blocked screen)
   ▼
nlParser.js  →  { disease, location, budgetMax, priority }
   │
   ▼
filters.js  →  filter 55 records  →  rank by specialty relevance
   │
   ▼
Ranked hospital list  →  grid / map / bot cards
```

The same three shared modules power the backend endpoints, the search page's live filtering, and the AI assistant — one source of truth, three consumers.

---

## Project Structure

```
├── api/
│   └── index.js          # Vercel serverless function: mounts the Express app under /api
├── backend/
│   ├── index.js          # Express app + routes (also exported for serverless use)
│   ├── data.js           # JSON-file store (seed → tmp copy on read-only platforms)
│   └── index.test.js     # 43 supertest/jest tests
├── frontend/
│   ├── src/
│   │   ├── pages/        # SearchPage, ComparisonPage, AdminPage
│   │   ├── components/   # HospitalCard, PatientReviews, AIChatbot, NLSearch, ...
│   │   ├── api.js        # REST client (same-origin /api base)
│   │   └── auth.js       # demo auth service
│   └── App.test.jsx      # 8 jsdom tests
├── shared/
│   ├── nlParser.js       # query → filters (single parser for all consumers)
│   ├── filters.js        # filtering + specialty-relevance ranking
│   └── medicalClassifier.js  # medical / non-medical gate
├── functions/            # OPTIONAL: Firebase Cloud Functions wrapper (not required)
├── hospitals_seed.json   # 55-record dataset
└── vercel.json           # builds + /api routing + SPA fallback
```

---

## Deployment

### Vercel (current, active)

Frontend and backend deploy **together** as one Vercel project:

- `vercel.json` builds the frontend (`npm run vercel-build` → `frontend/dist`) and ships `api/index.js` as a Node serverless function.
- Routes: `/api/*` → the Express-backed function (prefix stripped); everything else → the React SPA with an `index.html` fallback for deep links.
- The frontend talks to the backend via the **same origin** (`/api/...`) — no CORS, no separate URL, no environment variables needed.

Redeploying:

```bash
npx vercel --prod        # from the repo root (requires `vercel login` once)
```

or simply `git push` if the repo is connected to the project in the Vercel dashboard.

> **Serverless persistence note:** the deployed filesystem is read-only, so the data store writes to an instance-local copy in `/tmp`. Reads and all search/bot features always work; admin create/edit/delete persist only until that serverless instance recycles (minutes to hours). The seed restores cleanly afterwards — nothing breaks, changes just reset. Permanent storage would mean moving to Firestore or Vercel KV.

### Firebase Cloud Functions (optional alternative)

A ready-made wrapper lives in `functions/` (bundles backend + shared modules with esbuild, deploys via `firebase deploy --only functions`). It requires the Blaze plan and is **not needed** while the Vercel deployment is active — it is kept as an alternative target.

---

## Simulated vs Real

| Aspect | Status |
|--------|--------|
| Hospital data | **Synthetic** — 55 fake records; a "Demo Data" badge is shown in the header |
| Patient Reviews | **Sample percentages** — deterministically varied per hospital, clearly labelled, never real survey data |
| NL search | **Rule-based parser** (regex/keywords) — no API key needed; structured for a one-function LLM swap |
| Auth | **Client-side demo only** — credentials are not verified by any server; roles are self-selected |
| Ratings & costs | Fabricated demo numbers — do not represent real hospital pricing or quality |
| Helpline number | Fictional (1800-889-9999) |
| Database | JSON file (`hospitals_seed.json`); tests use an isolated temp copy |

---

## Known Limitations

1. **Demo auth is not security.** Any email/password combination "logs in", and the admin role is self-selected. A real deployment needs server-side auth (e.g. Firebase Auth/JWT) plus server-side authorization on the admin endpoints.
2. **No real hospital data** — all 55 records, costs, ratings, and review percentages are synthetic.
3. **Rule-based NL parser only** — no LLM integration (see below for the swap path).
4. **No rate limiting / helmet / request hardening** on the backend.
5. **Serverless writes are instance-local** — admin CRUD changes reset when the serverless instance recycles (see Deployment note).
6. **Admin API is unauthenticated** — the frontend gates the admin UI, but the API itself has no auth (see #1).

---

## Extending with a Real LLM

Replace `parseQueryToFilters()` in `shared/nlParser.js` with an LLM call — the function signature and return format (`{ disease, location, budgetMax, priority }`) stay the same, so the backend, search page, and assistant keep working unchanged. Keep the medical-only gate (`shared/medicalClassifier.js`) in front of it as a cheap pre-filter.

---

## License

MIT — Hackathon MVP
