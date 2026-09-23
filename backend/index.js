import express from 'express';
import cors from 'cors';
import { searchHospitals, getAllHospitals, getHospitalById, createHospital, updateHospital, deleteHospital } from './data.js';
import { parseQueryToFilters, CLASSIFY } from '../shared/nlParser.js';
import { classifyQuery } from '../shared/medicalClassifier.js';

const app = express();
// Parse PORT safely: an env value like "0" is truthy as a string, so a
// naive `|| 3001` would silently bind to a random ephemeral port.
const PORT_CANDIDATE = Number(process.env.PORT);
const PORT = Number.isInteger(PORT_CANDIDATE) && PORT_CANDIDATE > 0 ? PORT_CANDIDATE : 3001;

app.use(cors());
app.use(express.json());

// -----------------------------
// Health check
// -----------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// -----------------------------
// Search (structured filters)
// -----------------------------
app.get('/hospitals/search', (req, res) => {
  const { disease, city, state, budget_max } = req.query;
  let budgetMax;
  if (budget_max !== undefined) {
    budgetMax = Number(budget_max);
    if (Number.isNaN(budgetMax)) {
      return res.status(400).json({ error: 'Invalid budget_max value' });
    }
  }

  const results = searchHospitals({ disease, city, state, budgetMax });
  res.json(results);
});

// -----------------------------
// Medical classification endpoint
// -----------------------------
// Standalone gate so any client (chatbot, search bar, voice) can ask "is this
// even a medical query?" BEFORE rendering any hospital list.
app.post('/search/classify', (req, res) => {
  const { query } = req.body ?? {};
  if (typeof query !== 'string') {
    return res.status(400).json({ error: 'Query must be a string' });
  }
  if (!query.trim()) {
    return res.status(400).json({ error: 'Query must not be empty' });
  }

  const classification = classifyQuery(query);
  res.json({
    query,
    category: classification.category,
    reason: classification.reason,
    isMedical: classification.category === CLASSIFY.MEDICAL,
  });
});

// -----------------------------
// Natural language search
// -----------------------------
app.post('/search/nl', (req, res) => {
  const { query } = req.body ?? {};
  if (typeof query !== 'string') {
    return res.status(400).json({ error: 'Query must be a string' });
  }

  const filters = parseQueryToFilters(query);

  // Hard gate: food / tech / travel / anything non-medical gets NO hospitals.
  // Without this, disease=null made the search fall through to ALL hospitals
  // (that is how "paneer tikka" returned a full list).
  if (filters.nonMedical) {
    return res.json({
      query,
      category: CLASSIFY.NON_MEDICAL,
      reason: filters.nonMedicalReason,
      message:
        'This assistant only handles medical queries: illness, transplant, checkup, injury, emergency, or treatment. Please describe a medical condition or need.',
      extractedFilters: filters,
      hospitals: [],
    });
  }

  const results = searchHospitals({
    disease: filters.disease,
    city: filters.location,
    budgetMax: filters.budgetMax,
  });

  res.json({ query, category: CLASSIFY.MEDICAL, extractedFilters: filters, hospitals: results });
});

// -----------------------------
// List / read
// -----------------------------
app.get('/hospitals', (req, res) => {
  res.json(getAllHospitals().map((h) => ({ ...h })));
});

function parseHospitalId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 0 ? id : null;
}

app.get('/hospitals/:id', (req, res) => {
  const id = parseHospitalId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Invalid hospital ID' });
  }
  const hospital = getHospitalById(id);
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found' });
  }
  res.json({ ...hospital });
});

// -----------------------------
// Create / update / delete
// -----------------------------
app.post('/hospitals', (req, res) => {
  const body = req.body ?? {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const errors = [];
  if (!name) errors.push('name is required');
  if (!city) errors.push('city is required');
  if (Object.keys(body).length === 0) errors.push('Request body is required');
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }

  const created = createHospital(body);
  res.status(201).json(created);
});

app.put('/hospitals/:id', (req, res) => {
  const id = parseHospitalId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Invalid hospital ID' });
  }
  const body = req.body ?? {};
  if (Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Request body is required' });
  }
  const updated = updateHospital(id, body);
  if (!updated) {
    return res.status(404).json({ error: 'Hospital not found' });
  }
  res.json(updated);
});

app.delete('/hospitals/:id', (req, res) => {
  const id = parseHospitalId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Invalid hospital ID' });
  }
  const deleted = deleteHospital(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Hospital not found' });
  }
  res.status(204).send();
});

// -----------------------------
// 404 + error handlers
// -----------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled backend error:', err);
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

const isDirectRun = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

export { app, parseQueryToFilters };
