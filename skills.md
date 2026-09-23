Fixed Scope — isse bahar mat jao

Sirf ye 4 deliverables banao, aur kuch nahi:

Hospital search — filters: disease, location, budget
AI feature — natural language query → structured search filters (e.g. "kidney treatment near Chandigarh under ₹2 lakh" → {disease, city, budget_max})
Comparison view — 2-3 hospitals side by side, kam se kam 2 verifiable metrics (cost range, bed count, accreditation, patient volume — NOT doctor "success rate", woh scope se bahar hai)
Admin dashboard — basic CRUD (add/edit/delete/list hospital records), auth zaroori nahi is MVP ke liye

Agar koi feature in 4 se bahar lagta hai (doctor ratings, emergency dispatch, telemedicine, bill negotiation, auth system, real hospital data scraping) — ruk jao aur pooch lo, silently add mat karo. Ye sab out of scope hai.

Data hamesha synthetic/sample honi chahiye, aur UI mein clearly label ("Demo Data" badge) hona chahiye ki ye real hospital records nahi hain.

Folder Structure — non-negotiable
project-root/
├── backend/     ← API, data, AI calls, business logic
└── frontend/    ← UI only
Backend aur frontend kabhi mix mat karo — na koi API route frontend/ mein, na koi UI component backend/ mein, chahe "quick fix" ke liye hi kyun na ho.
Naya major piece (jaise mobile app) chahiye ho to usko apna top-level folder do, backend/frontend ke andar mat thoso.
Data Model (hospital record)
id, name, city, pincode, lat, long
specialties: list (e.g. "kidney", "cardiac", "orthopedic")
cost_estimate_min, cost_estimate_max
facilities: list (e.g. "ICU", "Robotic Surgery", "Private Rooms")
bed_count, accreditation_status, patient_volume

Seed dataset already available: hospitals_seed.json (30 synthetic hospitals, Punjab + major Indian cities). Isko load karo, naya dataset invent mat karo.

AI / NL Search Feature
Endpoint: POST /search/nl { query: string } → extract {disease, location, budget_max, priority} → filter hospitals usi se
Agar LLM API key configured nahi hai, to rule-based fallback banao (keyword/regex extraction) taaki demo tab bhi chale — lekin function parse_query_to_filters(text) -> dict isolated rakho taaki baad mein real LLM call se swap ho sake
UI mein extracted filters dikhao user ko ("Searching for: Kidney • Chandigarh • under ₹2,00,000") — ye explainability step skip mat karo, demo mein achha lagta hai aur banana sasta hai
Code Quality Rules (har change mein apply karo)
Naming clear ho — data2, temp, foo jaise naam mat use karo
Single responsibility — ek function ek hi kaam kare; parsing + validation + DB writes ek saath mat karo
No magic numbers/strings — named constants use karo
Explicit error handling — empty catch/except blocks mat chhodo, meaningful error response do (e.g. 400 with message)
No duplicated logic — 3+ jagah repeat ho rahi logic ko helper mein nikalo
Dead code hatao — placeholder/scaffold files jo ab use nahi ho rahe, unused imports/functions, sab clean karo finish karne se pehle
Scoped edits — jo specifically maanga gaya hai wahi badlo; unrelated files refactor/rename mat karo "while you're in there"
Testing — required, optional nahi
Backend: har endpoint ka kam se kam 1 test — happy path + 1 failure case (missing filter, bad budget value, etc.) — pytest + FastAPI TestClient (ya Node equivalent) use karo
Frontend: har interactive component (search form, comparison selector, admin form) ka test — render hota hai ya nahi + basic interaction (type/click/submit) expected result deta hai ya nahi — React Testing Library, API calls ko mock karo
Implementation details test mat karo — observable behavior test karo (user kya dekh/kar sakta hai), internal state nahi
Tests likhne ke baad actually RUN karo — pass/fail result dikhao, sirf likh ke "done" mat bolo
Handoff Prompt Rules (agar kisi doosre AI coding tool ko de rahe ho)

Har handoff prompt mein ye explicitly likho:

Backend/frontend separate top-level folders mein rakho, mix mat karo.
Jo bhi unused/dead file ya code bane, use hatao — scaffolding mat chhodo.
Sirf wahi badlo jo specifically maanga gaya hai. Unrelated files refactor/rename mat karo. Agar broader change genuinely zaroori lage, pehle ruk kar pooch lo.
Clean code practices follow karo: clear naming, single-responsibility functions, no magic numbers, explicit error handling, no duplicate logic.
Jo bhi banao uske tests likho: backend logic → pytest coverage (happy path + edge case); frontend interactive components → DOM-level tests (React Testing Library) verifying render + interaction behavior, internal implementation nahi. Tests actually run karo, pass/fail report karo, tabhi "done" bolo.
Self-check — task complete maanne se pehle
 backend/ aur frontend/ ka clean split maintained hai?
 Koi unused/dead file ya code hataya jo ab reference nahi ho raha?
 Sirf zaroori files touch ki, scope ke bahar kuch nahi chheda?
 Agar scope se bahar kuch touch karna pada, to explicitly flag/justify kiya?
 Naming clear, functions single-responsibility, no magic numbers, error handling explicit hai?
 Backend logic ka pytest coverage hai (happy path + edge case)?
 Frontend interactive UI ka DOM-level test hai (render + interaction)?
 Tests actually chalaye aur pass hote confirm kiya?