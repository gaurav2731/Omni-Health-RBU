import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { filterHospitals, rankBySpecialtyRelevance } from '../shared/filters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data file resolution:
// 1. OMNIHEALTH_DATA_FILE env var (used by tests for isolation)
// 2. Root hospitals_seed.json (default)
// 3. cwd fallback
function resolveDataFile() {
  if (process.env.OMNIHEALTH_DATA_FILE) return process.env.OMNIHEALTH_DATA_FILE;
  const rootSeed = path.join(__dirname, '..', 'hospitals_seed.json');
  if (fs.existsSync(rootSeed)) return rootSeed;
  return path.join(process.cwd(), 'hospitals_seed.json');
}

const DATA_FILE = resolveDataFile();

const ALLOWED_FIELDS = [
  'name', 'city', 'state', 'pincode', 'lat', 'long', 'specialties',
  'cost_estimate_min', 'cost_estimate_max', 'facilities', 'bed_count',
  'accreditation_status', 'patient_volume', 'rating',
];

let hospitalsCache = null;

export function loadHospitals() {
  if (hospitalsCache) return hospitalsCache;
  if (!fs.existsSync(DATA_FILE)) {
    hospitalsCache = [];
    return hospitalsCache;
  }
  const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  hospitalsCache = Array.isArray(parsed) ? parsed : parsed.hospitals || [];
  return hospitalsCache;
}

export function getAllHospitals() {
  return loadHospitals();
}

export function getHospitalById(id) {
  return loadHospitals().find((h) => h.id === id);
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toList(value) {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// Strip unknown/injected fields (never allow API callers to set `id`).
function sanitizeHospital(input) {
  const clean = {};
  for (const key of ALLOWED_FIELDS) {
    if (input[key] !== undefined) clean[key] = input[key];
  }
  return clean;
}

function normalizeHospital(raw) {
  return {
    ...sanitizeHospital(raw),
    specialties: toList(raw.specialties),
    facilities: toList(raw.facilities),
    cost_estimate_min: toNumber(raw.cost_estimate_min, 0),
    cost_estimate_max: toNumber(raw.cost_estimate_max, 0),
    bed_count: toNumber(raw.bed_count, 0),
    patient_volume: toNumber(raw.patient_volume, 0),
    rating: toNumber(raw.rating, 0),
    lat: raw.lat === null || raw.lat === undefined || raw.lat === '' ? null : toNumber(raw.lat, null),
    long: raw.long === null || raw.long === undefined || raw.long === '' ? null : toNumber(raw.long, null),
  };
}

export function searchHospitals({ disease, city, state, budgetMax }) {
  const hospitals = loadHospitals();
  const result = filterHospitals(hospitals, { disease, city, state, budgetMax });

  // Specialty-relevance ranking: dedicated institutes ("Kidney Institute",
  // cath-lab hospitals, ...) come before generic multispecialty giants so
  // different diseases surface different hospitals at the top. Within the
  // same relevance tier, rating (then patient volume) decides the order.
  return rankBySpecialtyRelevance(
    result,
    disease,
    (a, b) => (b.rating || 0) - (a.rating || 0) || (b.patient_volume || 0) - (a.patient_volume || 0)
  ).map((h) => ({ ...h }));
}

export function createHospital(hospital) {
  const hospitals = loadHospitals();
  const normalized = normalizeHospital(hospital);
  const maxId = hospitals.reduce((max, h) => Math.max(max, Number(h.id) || 0), 0);
  const newHospital = { ...normalized, id: maxId + 1 };
  hospitals.push(newHospital);
  saveHospitals(hospitals);
  return { ...newHospital };
}

export function updateHospital(id, updates) {
  const hospitals = loadHospitals();
  const index = hospitals.findIndex((h) => h.id === id);
  if (index === -1) return null;
  hospitals[index] = { ...hospitals[index], ...normalizeHospital(updates), id };
  saveHospitals(hospitals);
  return { ...hospitals[index] };
}

export function deleteHospital(id) {
  const hospitals = loadHospitals();
  const index = hospitals.findIndex((h) => h.id === id);
  if (index === -1) return false;
  hospitals.splice(index, 1);
  saveHospitals(hospitals);
  return true;
}

function saveHospitals(hospitals) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(hospitals, null, 2));
  hospitalsCache = hospitals;
}
