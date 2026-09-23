// Shared hospital filtering + specialty-relevance ranking logic.
// Used by BOTH backend (data.js search endpoint) and frontend (SearchPage)
// so server and client always produce identical result sets.
//
// WHY RANKING EXISTS: the seed data has 40/55 hospitals tagged 'cardiac' and
// 33/55 tagged 'kidney' (real multispecialty giants like AIIMS/Medanta/CMC).
// A plain filter therefore returns "the same hospitals" for kidney, heart,
// lungs — the dedicated Heart/Kidney Institutes were buried. Every search now
// re-ranks by how SPECIALIZED a hospital is for the searched condition, so
// each disease puts its own institutes on top.

// Per-specialty facility keywords that mark a hospital as dedicated to it.
// A hospital with "Cath Lab" + "Heart Transplant Center" is cardiac-focused;
// a hospital with just an ICU is not. Keep keywords lowercase.
const SPECIALTY_FACILITY_KEYWORDS = {
  cardiac: ['cath lab', 'cardiac surgery', 'heart transplant', 'heart failure'],
  kidney: ['dialysis unit', 'organ transplant', 'transplant unit', 'nephro'],
  oncology: ['chemotherapy unit', 'radiation therapy', 'pet-ct', 'proton therapy', 'bone marrow'],
  neurology: ['neuro lab', 'intraoperative mri', 'stroke center'],
  orthopedic: ['joint', 'physiotherapy hub', 'robotic joint'],
  pulmonology: ['respiratory', 'ventilator', 'bronchoscopy', 'chest clinic'],
  gastroenterology: ['endoscopy', 'liver clinic', 'gi surgery'],
  pediatrics: ['nicu', 'picu', 'pediatric icu', 'child care'],
  gynecology: ['labour', 'labor room', 'maternity', 'nicu'],
};

// Name-derived specialty tags, used when the specialties array is thin.
// A hospital named "Heart Institute" IS a heart hospital regardless of tags.
const SPECIALTY_NAME_HINTS = {
  cardiac: ['heart', 'cardiac', 'cardio'],
  kidney: ['kidney', 'nephro', 'renal', 'urolog'],
  oncology: ['cancer', 'oncology'],
  orthopedic: ['ortho', 'joint'],
  neurology: ['neuro', 'brain', 'stroke'],
  pulmonology: ['lung', 'chest', 'pulmo'],
  gastroenterology: ['gastro', 'liver'],
  pediatrics: ['child', 'children', 'pediatric', 'paediatric'],
  gynecology: ['women', 'maternity'],
};

// How well is this hospital matched to `specialty`?
//   1.0 = dedicated by NAME ("Kidney Institute", "Heart Institute")
//   0.9 = dedicated facility infra (cath lab, dialysis unit, chemo unit...)
//   0.6 = dedicated specialty tag in its specialties list
//   0.0 = generic capability only
export function specialtyRelevance(hospital, specialty) {
  if (!specialty) return 0;
  const spec = String(specialty).toLowerCase();

  const name = String(hospital.name || '').toLowerCase();
  const nameHints = SPECIALTY_NAME_HINTS[spec] || [];
  if (nameHints.some((hint) => name.includes(hint))) return 1;

  const facilities = (Array.isArray(hospital.facilities) ? hospital.facilities : [])
    .map((f) => String(f).toLowerCase());
  const facilityHints = SPECIALTY_FACILITY_KEYWORDS[spec] || [];
  if (facilityHints.some((hint) => facilities.some((f) => f.includes(hint)))) return 0.9;

  const specialties = (Array.isArray(hospital.specialties) ? hospital.specialties : [])
    .map((s) => String(s).toLowerCase());
  if (specialties.some((s) => s === spec)) return 0.6;

  return 0;
}

// Re-rank a filtered list: highest relevance first; within the same tier the
// caller's sortFn (e.g. price or rating) decides the order.
export function rankBySpecialtyRelevance(hospitals, specialty, sortFn) {
  const list = sortFn ? [...hospitals].sort(sortFn) : [...hospitals];
  if (!specialty) return list;

  return list
    .map((h, index) => ({ h, relevance: specialtyRelevance(h, specialty), index }))
    .sort((a, b) => b.relevance - a.relevance || a.index - b.index)
    .map((entry) => entry.h);
}

// Main shared filter used by backend and frontend.
export function filterHospitals(hospitals, { disease, city, state, budgetMax } = {}) {
  let result = hospitals;

  if (disease) {
    const d = String(disease).toLowerCase();
    result = result.filter(
      (h) => Array.isArray(h.specialties) && h.specialties.some((s) => String(s).toLowerCase().includes(d))
    );
  }

  if (city) {
    const c = String(city).toLowerCase();
    result = result.filter((h) => String(h.city || '').toLowerCase().includes(c));
  }

  if (state) {
    const s = String(state).toLowerCase();
    result = result.filter((h) => String(h.state || '').toLowerCase() === s);
  }

  if (budgetMax !== undefined && budgetMax !== null && budgetMax !== '') {
    const b = Number(budgetMax);
    if (!Number.isNaN(b)) {
      result = result.filter((h) => Number(h.cost_estimate_min) <= b);
    }
  }

  // Return a shallow copy so callers can sort without mutating the source.
  return [...result];
}
