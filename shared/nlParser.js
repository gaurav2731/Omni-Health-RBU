// Shared natural-language query parser.
// Used by BOTH backend (POST /search/nl) and frontend (SearchPage, AIChatbot)
// so all three surfaces extract identical filters.
//
// Every keyword is matched with \b word boundaries (substring matching let
// "spinach" match "spine" and "hair transplant" match bare "transplant").
// Non-medical queries (food, tech, travel...) are rejected up-front via the
// shared classifier so NO hospital list is ever shown for them.

import { classifyQuery, CLASSIFY } from './medicalClassifier.js';

export { CLASSIFY };

export const DISEASE_KEYWORDS = {
  cardiac: ['cardiac', 'heart', 'cardiology', 'cath lab', 'angioplasty', 'bypass'],
  // NOTE: no bare 'transplant' — it wrongly matches "hair transplant".
  // 'kidney'/'dialysis'/'nephrology' already cover real kidney queries.
  kidney: ['kidney', 'renal', 'dialysis', 'nephrology', 'urology'],
  orthopedic: ['orthopedic', 'orthopaedic', 'bone', 'joint', 'knee', 'hip', 'spine', 'fracture'],
  neurology: ['neurology', 'neuro', 'brain', 'stroke', 'epilepsy'],
  oncology: ['oncology', 'cancer', 'tumor', 'tumour', 'chemotherapy', 'radiation'],
  pulmonology: ['pulmonology', 'lungs', 'lung', 'respiratory', 'asthma'],
  gastroenterology: ['gastroenterology', 'digestive', 'stomach', 'liver'],
  pediatrics: ['pediatrics', 'child', 'infant'],
  gynecology: ['gynecology', 'maternity', 'women'],
  // Hair transplant / skin / hair loss are dermatology procedures — done by
  // doctors, so they must surface hospitals too.
  dermatology: ['dermatology', 'dermatologist', 'skin', 'acne', 'hair transplant', 'hair transplantation', 'hair loss', 'hair fall', 'hairfall', 'baldness', 'alopecia', 'gynecomastia', 'prp'],
};

// Canonical specialty list for dropdowns (derived from the parser map).
export const SPECIALTIES = Object.keys(DISEASE_KEYWORDS);

// Curated city list: every city in the seed dataset + other major Indian cities.
// Matching is longest-first via word boundaries, so 'new delhi' wins over 'delhi'.
export const CITY_KEYWORDS = [
  'new delhi', 'delhi', 'chandigarh', 'mohali', 'panchkula', 'garhshankar',
  'hoshiarpur', 'ludhiana', 'amritsar', 'jalandhar', 'patiala', 'bathinda',
  'pathankot', 'dehradun', 'rishikesh', 'jaipur', 'udaipur', 'jodhpur', 'kota',
  'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad', 'mumbai',
  'navi mumbai', 'thane', 'pune', 'nagpur', 'nashik', 'chennai', 'coimbatore',
  'madurai', 'vellore', 'bangalore', 'bengaluru', 'mysore', 'hyderabad',
  'secunderabad', 'warangal', 'kochi', 'kolkata', 'howrah', 'durgapur',
  'asansol', 'ahmedabad', 'surat', 'vadodara', 'rajkot', 'lucknow', 'kanpur',
  'agra', 'varanasi', 'prayagraj', 'bhopal', 'indore', 'jabalpur', 'gwalior',
  'patna', 'gaya', 'muzaffarpur', 'ranchi', 'jamshedpur', 'bhubaneswar',
  'cuttack', 'guwahati', 'dibrugarh',
];

export const PRIORITY_KEYWORDS = {
  cost: ['cheap', 'affordable', 'low cost', 'budget', 'economical', 'inexpensive'],
  quality: ['best', 'top', 'premium', 'quality', 'reputed', 'renowned', 'excellent'],
  emergency: ['emergency', 'urgent', 'immediate', 'critical', 'asap', 'now'],
};

const BUDGET_PATTERNS = [
  /(?:under|below|less than|max|maximum|upto|up to)\s*(?:rs\.?|₹|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lakhs|l)?/i,
  /(?:rs\.?|₹|inr)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lakhs|l)?/i,
  /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lakhs|l)\s*(?:budget|max|maximum)?/i,
];

function matchesAnyWord(norm, keywords) {
  const sorted = [...keywords].sort((a, b) => b.length - a.length);
  const re = new RegExp(`\\b(?:${sorted.map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i');
  return re.test(norm);
}

export function parseQueryToFilters(text) {
  const textLower = String(text || '').toLowerCase();

  // Gate: non-medical queries never produce hospital filters.
  const classification = classifyQuery(textLower);
  if (classification.category !== CLASSIFY.MEDICAL) {
    return {
      disease: null,
      location: null,
      budgetMax: null,
      priority: null,
      nonMedical: true,
      nonMedicalReason: classification.reason,
    };
  }

  const filters = {
    disease: null,
    location: null,
    budgetMax: null,
    priority: null,
    nonMedical: false,
    nonMedicalReason: null,
  };

  // Normalize once for word-boundary keyword matching (keeps letters, digits,
  // apostrophes and hyphens; drops symbols like ₹ that would split words).
  const norm = textLower
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const [disease, keywords] of Object.entries(DISEASE_KEYWORDS)) {
    if (matchesAnyWord(norm, keywords)) {
      filters.disease = disease;
      break;
    }
  }

  for (const city of CITY_KEYWORDS) {
    if (matchesAnyWord(norm, [city])) {
      filters.location = city
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      break;
    }
  }

  for (const pattern of BUDGET_PATTERNS) {
    const match = textLower.match(pattern);
    if (match) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      const fullMatch = match[0].toLowerCase();
      if (fullMatch.includes('lakh') || fullMatch.endsWith('l')) {
        value *= 100000;
      }
      filters.budgetMax = Math.round(value);
      break;
    }
  }

  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (matchesAnyWord(norm, keywords)) {
      filters.priority = priority;
      break;
    }
  }

  return filters;
}
