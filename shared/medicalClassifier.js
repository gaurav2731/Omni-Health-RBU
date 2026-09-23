// Shared medical-query classifier.
// Used by BOTH backend (POST /search/nl, POST /search/classify) and the
// frontend chatbot so every surface agrees on what counts as a medical query.
//
// Rule for the hackathon: ONLY illness / transplant / checkup / injury /
// emergency / medical-procedure queries may show hospitals. Anything else
// (food, tech, travel, ...) must be rejected — judges once typed
// "paneer tikka" and got hospital results, which is exactly what this fixes.

// --- Word-boundary regex helpers --------------------------------------------
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesWordBoundary(norm, keywords) {
  const sorted = [...keywords].sort((a, b) => b.length - a.length);
  const re = new RegExp(`\\b(?:${sorted.map(escapeRegExp).join('|')})\\b`, 'i');
  return re.test(norm);
}

// --- Medical signals ---------------------------------------------------------
// Conditions, organs, specialties, symptoms. Word-based matching on purpose:
// "spine" must NOT match "spinach", "kidney" must not match inside other words.
export const MEDICAL_CONDITIONS = [
  'cancer', 'tumor', 'tumour', 'kidney', 'renal', 'dialysis', 'nephrology',
  'urology', 'heart', 'cardiac', 'cardiology', 'angioplasty', 'bypass',
  'hypertension', 'diabetes', 'thyroid', 'liver', 'hepatitis', 'jaundice',
  'stomach', 'gastric', 'ulcer', 'acidity', 'lungs', 'lung', 'asthma',
  'tuberculosis', 'pneumonia', 'bronchitis', 'respiratory', 'brain',
  'stroke', 'paralysis', 'epilepsy', 'migraine', 'bone', 'fracture',
  'knee', 'hip', 'spine', 'spinal', 'arthritis', 'anemia', 'anaemia',
  'allergy', 'eczema', 'psoriasis', 'rash', 'burn', 'burns', 'poisoning',
  'pregnancy', 'pregnant', 'maternity', 'miscarriage', 'infertility',
  'ivf', 'pcod', 'pcos', 'child', 'infant', 'baby', 'newborn',
  'pediatric', 'paediatric', 'gynecology', 'obstetrics', 'dentist',
  'dental', 'tooth', 'teeth', 'cataract', 'lasik', 'eye', 'ear', 'nose',
  'throat', 'sinus', 'tonsil', 'depression', 'anxiety', 'psychiatric',
  'psychiatry', 'insomnia', 'autism', 'adhd', 'hernia', 'appendix',
  'appendicitis', 'gallbladder', 'gallstone', 'stones', 'piles',
  'fistula', 'fissure', 'varicose', 'obesity', 'bariatric',
  'physiotherapy', 'physio', 'rehab', 'rehabilitation', 'vaccination',
  'vaccine', 'immunization', 'dengue', 'chikungunya', 'typhoid',
  // NOTE: no bare 'cold' — "cold coffee" / "cold drink" are food queries.
  // 'common cold' is in ALWAYS_MEDICAL_PHRASES; cough/flu/fever cover illness.
  'malaria', 'fever', 'infection', 'flu', 'cough', 'corona',
  'covid', 'cholesterol', 'diarrhea', 'diarrhoea', 'constipation',
  'vomiting', 'nausea', 'acidity', 'heartburn', 'gerd', 'ibs', 'colitis',
  'hemorrhoids', 'bleeding', 'seizure', 'seizures', 'fits', 'uti',
  'prostate', 'hiv', 'aids', 'rabies', 'tetanus', 'oncology',
  'chemotherapy', 'chemo', 'radiation', 'neurology', 'neuro',
  'neurosurgery', 'orthopedic', 'orthopaedic', 'pulmonology',
  'gastroenterology', 'dermatology', 'ophthalmology', 'ent',
  'psychiatrist', 'pediatrician', 'gynecologist', 'urologist',
  'cardiologist', 'oncologist', 'pathology', 'radiology', 'icu', 'nicu',
  'picu', 'trauma', 'injury', 'injuries', 'injured', 'accident',
  'emergency', 'ambulance', 'wound', 'wounds', 'sprain', 'dislocation',
  'drowning', 'snake', 'scorpion', 'bite', 'sting', 'pain', 'ache',
  'swelling', 'swollen', 'itching', 'weakness', 'fatigue', 'dizzy',
  'dizziness', 'faint', 'unconscious', 'numbness', 'cramps',
  'stiffness', 'bruise', 'symptom', 'symptoms', 'syndrome', 'disease',
  'illness', 'sickness', 'patient', 'patients', 'doctor', 'doctors',
  'hospital', 'hospitals', 'clinic', 'clinics', 'dispensary', 'medical',
  'health', 'medicine', 'medicines', 'medication', 'prescription',
  'diagnosis', 'diagnose', 'cure', 'recovery', 'nurse', 'nursing',
  'cath lab', 'cathlab', 'pacemaker', 'stent', 'angiography',
  'nephrectomy', 'lithotripsy', 'arthroscopy', 'arthroplasty',
  'prosthesis', 'implant', 'implants', 'sonography', 'endoscopy',
  'colonoscopy', 'biopsy', 'x-ray', 'x ray', 'mri', 'ct scan',
  'ultrasound', 'ecg', 'eeg', 'echo', 'blood test', 'blood sugar',
  'blood pressure', 'blood bank', 'blood donation', 'oxygen',
  'ventilator', 'anesthesia', 'sedation',
  // Dermatology / cosmetic-procedure signals (hair transplant etc.)
  // NOTE: no bare 'bald' ("bald eagle") and no bare 'graft' ("police graft").
  'hair transplant', 'hair transplantation', 'hair loss', 'hair fall',
  'hairfall', 'baldness', 'alopecia', 'gynecomastia',
  'prp', 'acne', 'pimple', 'pigmentation', 'hair grafting',
];

// Words that describe a medical ACTION (may appear without a condition).
export const MEDICAL_INTENTS = [
  'transplant', 'transplants', 'checkup', 'check-up', 'check up',
  'screening', 'surgery', 'surgeries', 'surgical', 'operation',
  'treatment', 'treatments', 'therapy', 'therapies', 'consultation',
  'emergency', 'injury', 'injuries', 'injured', 'trauma', 'vaccination',
  'vaccine', 'immunization', 'dialysis', 'chemotherapy', 'physio',
  'physiotherapy', 'rehab', 'biopsy', 'admission', 'admit', 'icu',
  'ambulance', 'dressing', 'stitches', 'sutures', 'suture', 'stitch',
  'plaster', 'cast', 'replacement', 'replacement surgery', 'scan',
  'scans', 'second opinion', 'follow up', 'followup', 'opd', 'ipd',
  'first aid', 'firstaid', 'cpr', 'hair grafting', 'prp',
];

// Garbage / non-medical things judges may type: dishes, places, tech, etc.
// Any of these WITH no medical signal => non-medical.
export const NON_MEDICAL_KEYWORDS = [
  // food / dishes / drinks
  'paneer', 'tikka', 'biryani', 'briyani', 'butter chicken', 'chicken',
  'mutton', 'fish curry', 'prawns', 'curry', 'dal', 'daal', 'roti',
  'chapati', 'naan', 'paratha', 'puri', 'dosa', 'idli', 'vada',
  'uttapam', 'sambar', 'rasam', 'pakora', 'pakoda', 'samosa', 'kachori',
  'chaat', 'pani puri', 'bhel', 'dhokla', 'khandvi', 'kheer', 'halwa',
  'gulab jamun', 'rasgulla', 'jalebi', 'laddu', 'ladoo', 'barfi',
  'sandesh', 'chole', 'chana', 'rajma', 'khichdi', 'pulao', 'fried rice',
  'noodles', 'chowmein', 'momos', 'momo', 'spring rolls', 'soup',
  'salad', 'pizza', 'burger', 'pasta', 'macaroni', 'sandwich',
  'shawarma', 'shwarma', 'kebab', 'tandoori', 'malai', 'kofta', 'korma',
  'cake', 'pastry', 'ice cream', 'icecream', 'chocolate', 'chips',
  'kurkure', 'namkeen', 'bhujia', 'maggi', 'menu', 'restaurant',
  'restaurants', 'dhaba', 'food', 'foods', 'dish', 'dishes', 'meal',
  'meals', 'breakfast', 'lunch', 'dinner', 'supper', 'snack', 'snacks',
  'dessert', 'desserts', 'cuisine', 'recipe', 'recipes', 'cook',
  'cooking', 'kitchen', 'grocery', 'groceries', 'vegetable',
  'vegetables', 'fruit', 'fruits', 'spinach', 'palak', 'cheese',
  'butter', 'ghee', 'masala', 'spices', 'honey', 'dry fruits', 'milk',
  'curd', 'yogurt', 'mango', 'apple', 'banana', 'orange', 'grapes',
  'guava', 'papaya', 'watermelon', 'pineapple', 'pomegranate',
  'coconut', 'tea', 'chai', 'coffee', 'juice', 'lassi', 'chaas',
  'shake', 'smoothie', 'mocktail', 'cocktail', 'beer', 'wine',
  'whisky', 'whiskey', 'vodka', 'rum', 'mojito', 'cold drink',
  'soft drink', 'soda', 'water bottle', 'thali',
  // tech / entertainment / travel / misc
  'movie', 'movies', 'film', 'films', 'cinema', 'song', 'songs',
  'music', 'concert', 'game', 'games', 'gaming', 'phone', 'mobile',
  'laptop', 'computer', 'wifi', 'internet', 'software', 'website',
  'youtube', 'instagram', 'facebook', 'whatsapp', 'netflix', 'hotstar',
  'zomato', 'swiggy', 'resort', 'resorts', 'hotel booking', 'ticket',
  'tickets', 'booking', 'flight', 'flights', 'train', 'trains', 'bus',
  'buses', 'cab', 'cabs', 'uber', 'ola', 'taxi', 'airport', 'railway',
  'station', 'visa', 'passport', 'shopping', 'mall', 'malls', 'market',
  'salon', 'spa', 'gym', 'gyms', 'school', 'college', 'university',
  'exam', 'exams', 'job', 'jobs', 'interview', 'salary', 'bank',
  'banks', 'loan', 'loans', 'emi', 'stock', 'stocks', 'share market',
  'crypto', 'bitcoin', 'tax', 'taxes', 'weather', 'rain', 'monsoon',
  'election', 'elections', 'cricket', 'football', 'sports', 'ipl',
  'kabaddi', 'hockey',
];

// Phrases that contain a medical-ish word but are NOT medical queries.
export const NON_MEDICAL_EXCEPTIONS = [
  'hospital food', 'hospital food menu', 'hospital cafeteria',
  'cafeteria menu', 'hospital menu', 'heart-shaped cake',
  'heart shaped cake', 'open heart kitchen', 'heart of the city',
  'heart of city',
];

// Real medical phrases that must win even if they contain an exception
// fragment (e.g. "open heart surgery" contains "open heart").
const ALWAYS_MEDICAL_PHRASES = [
  'open heart surgery', 'heart surgery', 'heart operation',
  'heart transplant', 'liver transplant', 'kidney transplant',
  'bypass surgery', 'heart attack', 'common cold',
  // Hair transplant is a real dermatology/plastic-surgery procedure done by
  // doctors — it must classify as medical (regression: it was rejected).
  'hair transplant', 'hair transplantation',
];

export const CLASSIFY = {
  MEDICAL: 'medical',
  NON_MEDICAL: 'non_medical',
};

// Classify a free-text query as medical or non-medical.
export function classifyQuery(text) {
  const norm = normalizeText(text);
  if (!norm) return { category: CLASSIFY.NON_MEDICAL, reason: 'empty' };

  // 0) Unambiguous medical phrases always win.
  if (ALWAYS_MEDICAL_PHRASES.some((p) => norm.includes(p))) {
    return { category: CLASSIFY.MEDICAL, reason: 'unambiguous medical phrase' };
  }

  // 1) Explicit non-medical exception phrases ("hospital food menu").
  if (NON_MEDICAL_EXCEPTIONS.some((p) => norm.includes(p))) {
    return { category: CLASSIFY.NON_MEDICAL, reason: 'non-medical exception phrase' };
  }

  // 2) Word-boundary detection on both vocabularies.
  const conditionHit = matchesWordBoundary(norm, MEDICAL_CONDITIONS);
  const intentHit = matchesWordBoundary(norm, MEDICAL_INTENTS);
  const nonMedicalHit = matchesWordBoundary(norm, NON_MEDICAL_KEYWORDS);

  // 3) Medical signal present => medical, even if food words also appear
  //    ("diet for kidney patients" should still match kidney hospitals).
  if (conditionHit || intentHit) {
    return { category: CLASSIFY.MEDICAL, reason: conditionHit ? 'medical condition detected' : 'medical intent detected' };
  }

  // 4) Non-medical word with no medical signal => reject.
  if (nonMedicalHit) {
    return { category: CLASSIFY.NON_MEDICAL, reason: 'non-medical topic detected' };
  }

  // 5) Unknown words with no medical vocabulary => reject (strict mode).
  return { category: CLASSIFY.NON_MEDICAL, reason: 'no medical signal' };
}

export function isMedicalQuery(text) {
  return classifyQuery(text).category === CLASSIFY.MEDICAL;
}

export default { classifyQuery, isMedicalQuery, CLASSIFY };
