You are building "OmniHealth Lite" — a 2-day hackathon MVP for a hospital 
discovery platform. Ship a working, demoable product. Do not over-engineer 
or gold-plate. Scope is fixed — do NOT add features beyond what's listed.

## PROJECT SCOPE (exactly these 4 deliverables, nothing more)
1. Hospital search with filters: disease, location, budget
2. One AI feature: natural language query → structured search filters
3. Hospital comparison view with at least 2 verifiable metrics
4. Admin dashboard to add/edit/view hospital records (basic CRUD, no auth needed)

Use synthetic/sample data (20-40 fake hospitals). Clearly label it as 
simulated data in the UI (e.g. a small "Demo Data" badge).

## STRUCTURE (non-negotiable)
project-root/
├── backend/     ← API, data, AI calls, business logic
└── frontend/    ← UI only

Never mix these. Never put an API route in frontend/ or a component in backend/.

## STACK
- Backend: Python FastAPI (or Node/Express if you're faster in it) + SQLite 
  (simple file DB, no need for Postgres for a 2-day MVP)
- Frontend: React + Vite, plain CSS or Tailwind (keep it simple, clean, readable)
- AI: use whichever LLM API is configured/available. If none is configured, 
  build the NL→filter parser as a rule-based fallback (regex/keyword extraction 
  for disease, city, budget numbers) so the demo works even without an API key, 
  but structure the code so a real LLM call can be swapped in later via one 
  function (e.g. `parse_query_to_filters(text: str) -> dict`).

## DATA MODEL (hospital record)
- id, name, city, pincode, lat, long
- specialties: list of disease/procedure tags (e.g. "kidney", "cardiac", "orthopedic")
- cost_estimate_min, cost_estimate_max (per specialty, or a simple average — pick 
  whichever is faster to implement cleanly)
- facilities: list (e.g. "ICU", "Robotic Surgery", "Private Rooms")
- bed_count, accreditation_status (e.g. "NABH Accredited" / "Not Accredited")
- patient_volume (a synthetic number for the comparison metric)

## DELIVERABLE 1 — Search
- Filter UI: disease dropdown/search, location (city or radius from a point), 
  budget range slider or min/max inputs
- Backend endpoint: GET /hospitals/search?disease=&city=&budget_max=
- Results list: hospital name, city, cost range, key facilities, at a glance

## DELIVERABLE 2 — AI natural language search
- Single text input: "Find kidney treatment hospitals near Chandigarh under ₹2 lakh"
- Backend endpoint: POST /search/nl { query: string } → returns extracted 
  { disease, location, budget_max, priority } AND the filtered hospital results
- UI: show the user what was extracted ("Searching for: Kidney • Chandigarh • 
  under ₹2,00,000") before showing results — this is the explainability feature, 
  don't skip it, it's cheap to build and looks good in a demo

## DELIVERABLE 3 — Comparison view
- User selects 2-3 hospitals from search results → comparison screen
- Side-by-side cards/table showing at minimum: cost estimate range and 
  bed_count/accreditation_status (pick 2+ metrics from the data model, 
  keep it to real synthetic numbers, don't fabricate "success rates" — 
  that's out of scope)

## DELIVERABLE 4 — Admin dashboard
- Simple route (e.g. /admin) with:
  - Table listing all hospital records
  - Form to add a new hospital record
  - Edit/delete existing records
- No auth required for MVP — note this as a known limitation in a README, 
  don't build a login system, that's out of scope and wastes time

## CODE QUALITY RULES (apply throughout, don't skip)
- Clear naming everywhere — no `data2`, `temp`, `foo`
- Each function does one thing; split anything handling parsing + validation 
  + DB writes together
- No magic numbers/strings — use named constants
- Explicit error handling — no empty catch/except blocks, return meaningful 
  error responses (e.g. 400 with a message) for bad input
- No duplicated logic — extract shared code into a helper if it appears 3+ times
- Remove any placeholder/scaffold file or dead code before calling something done

## TESTING (required, not optional)
- Backend: at least one test per endpoint — happy path + one failure case 
  (e.g. missing required filter, malformed budget value). Use pytest + FastAPI 
  TestClient (or the Node equivalent).
- Frontend: at least one test per interactive component (search form, comparison 
  selector, admin form) using React Testing Library — verify it renders and that 
  a basic interaction (typing, clicking submit) produces the expected result. 
  Mock API calls, don't hit the real backend in unit tests.
- Actually RUN the tests before reporting anything as done. Show me pass/fail 
  output, don't just claim it works.

## PROCESS
- Build in this order: data model + seed data → backend search endpoint → 
  frontend search UI → AI/NL endpoint → comparison view → admin dashboard → tests
- After each major piece, tell me what you built, which files you touched, 
  and run it so I can see it work before moving to the next piece
- If you think something outside this scope is genuinely required to make a 
  listed feature work, STOP and tell me why — don't silently add it
- At the end, give me a short README: how to run backend + frontend, what's 
  simulated/synthetic vs real, and known limitations (no auth, no real hospital 
  data, no real LLM key if using fallback parser, etc.)

Start now with the data model, seed dataset, and backend search endpoint.