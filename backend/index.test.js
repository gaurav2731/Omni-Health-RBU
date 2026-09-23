import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Each test run gets its own temp data file seeded from the root seed,
// so tests NEVER mutate hospitals_seed.json (this was a real bug before).
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omnihealth-test-'));
const tempDataFile = path.join(tempDir, 'hospitals.json');
fs.writeFileSync(tempDataFile, fs.readFileSync(path.join(__dirname, '..', 'hospitals_seed.json'), 'utf-8'));
process.env.OMNIHEALTH_DATA_FILE = tempDataFile;

// Import AFTER the env var is set so data.js resolves the temp file.
const request = (await import('supertest')).default;
const { app } = await import('./index.js');
const dataLayer = await import('./data.js');
const { parseQueryToFilters } = await import('../shared/nlParser.js');
const { classifyQuery, CLASSIFY } = await import('../shared/medicalClassifier.js');

afterAll(() => {
  delete process.env.OMNIHEALTH_DATA_FILE;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('parseQueryToFilters', () => {
  test('kidney chandigarh 2 lakh', () => {
    const result = parseQueryToFilters('kidney treatment near Chandigarh under 2 lakh');
    expect(result.disease).toBe('kidney');
    expect(result.location).toBe('Chandigarh');
    expect(result.budgetMax).toBe(200000);
  });

  test('cardiac delhi 500000', () => {
    const result = parseQueryToFilters('heart surgery in Delhi under ₹500000');
    expect(result.disease).toBe('cardiac');
    expect(result.location).toBe('Delhi');
    expect(result.budgetMax).toBe(500000);
  });

  test('orthopedic mumbai 3 lakh', () => {
    const result = parseQueryToFilters('knee replacement Mumbai 3 lakh budget');
    expect(result.disease).toBe('orthopedic');
    expect(result.location).toBe('Mumbai');
    expect(result.budgetMax).toBe(300000);
  });

  test('non-medical query is gated with nonMedical flag', () => {
    const result = parseQueryToFilters('paneer tikka');
    expect(result.disease).toBe(null);
    expect(result.nonMedical).toBe(true);
  });

  test('medical query has nonMedical=false', () => {
    const result = parseQueryToFilters('kidney treatment near Chandigarh');
    expect(result.nonMedical).toBe(false);
    expect(result.disease).toBe('kidney');
  });

  test('word boundaries: spinach does not match spine', () => {
    const result = parseQueryToFilters('spinach soup recipe');
    expect(result.disease).toBe(null);
    expect(result.nonMedical).toBe(true);
  });
});

describe('classifyQuery', () => {
  test('food queries are non-medical', () => {
    for (const q of ['paneer tikka', 'best biryani near me', 'butter chicken recipe', 'cold coffee with ice cream']) {
      expect(classifyQuery(q).category).toBe(CLASSIFY.NON_MEDICAL);
    }
  });

  test('illness / transplant / checkup / injury are medical', () => {
    for (const q of [
      'kidney failure treatment',
      'liver transplant',
      'full body checkup',
      'leg fracture after accident',
      'heart bypass surgery',
      'child fever since 2 days',
      'snake bite emergency',
      'knee replacement',
    ]) {
      expect(classifyQuery(q).category).toBe(CLASSIFY.MEDICAL);
    }
  });

  test('unknown gibberish with no medical vocabulary is rejected', () => {
    expect(classifyQuery('xyzzy plugh qwerty').category).toBe(CLASSIFY.NON_MEDICAL);
    expect(classifyQuery('').category).toBe(CLASSIFY.NON_MEDICAL);
  });

  test('"hospital food menu" is non-medical despite medical words', () => {
    expect(classifyQuery('hospital food menu').category).toBe(CLASSIFY.NON_MEDICAL);
  });

  test('"open heart surgery" stays medical despite exception fragment', () => {
    expect(classifyQuery('open heart surgery').category).toBe(CLASSIFY.MEDICAL);
  });

  test('food words alongside a condition stay medical', () => {
    expect(classifyQuery('diet food for kidney patients').category).toBe(CLASSIFY.MEDICAL);
  });

  test('hair transplant is medical (it is a dermatology procedure)', () => {
    expect(classifyQuery('hair transplant').category).toBe(CLASSIFY.MEDICAL);
    expect(classifyQuery('best hair transplant in Delhi').category).toBe(CLASSIFY.MEDICAL);
    expect(classifyQuery('hair fall treatment').category).toBe(CLASSIFY.MEDICAL);
  });

  test('hair transplant maps to dermatology hospitals', () => {
    const result = parseQueryToFilters('hair transplant in Delhi');
    expect(result.disease).toBe('dermatology');
    expect(result.location).toBe('Delhi');
  });
});

describe('GET /hospitals/search', () => {
  test('happy path with filters', async () => {
    const response = await request(app)
      .get('/hospitals/search?disease=kidney&city=Chandigarh&budget_max=200000')
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    for (const h of response.body) {
      expect(h.specialties.some((s) => s.toLowerCase().includes('kidney'))).toBe(true);
      expect(h.city.toLowerCase()).toBe('chandigarh');
      expect(h.cost_estimate_min).toBeLessThanOrEqual(200000);
      expect(typeof h.id).toBe('number');
    }
  });

  test('state filter works', async () => {
    const response = await request(app)
      .get('/hospitals/search?state=Punjab')
      .expect(200);
    expect(response.body.length).toBeGreaterThan(0);
    for (const h of response.body) {
      expect(h.state).toBe('Punjab');
    }
  });

  test('no filters returns all', async () => {
    const response = await request(app).get('/hospitals/search').expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('bad budget value returns 400', async () => {
    await request(app).get('/hospitals/search?budget_max=invalid').expect(400);
  });

  test('different diseases surface DIFFERENT dedicated hospitals first', async () => {
    const top = async (disease) => {
      const res = await request(app).get(`/hospitals/search?disease=${disease}`).expect(200);
      return res.body.slice(0, 3).map((h) => h.name);
    };
    const kidneyTop = await top('kidney');
    const cardiacTop = await top('cardiac');
    const oncologyTop = await top('oncology');

    // Kidney search must lead with a kidney-dedicated institute, not a
    // generic multispecialty giant (regression: AIIMS/Medanta topped every
    // disease because the seed tags most big hospitals with everything).
    expect(kidneyTop[0]).toMatch(/kidney|nephro/i);
    expect(cardiacTop[0]).toMatch(/cardiac|heart/i);
    expect(oncologyTop[0]).toMatch(/cancer|oncolog/i);

    // And the three lists must not be identical.
    expect(JSON.stringify(kidneyTop)).not.toBe(JSON.stringify(cardiacTop));
    expect(JSON.stringify(cardiacTop)).not.toBe(JSON.stringify(oncologyTop));
  });
});

describe('POST /search/nl', () => {
  test('happy path', async () => {
    const response = await request(app)
      .post('/search/nl')
      .send({ query: 'kidney treatment in Chandigarh under 2 lakh' })
      .expect(200);
    expect(response.body.extractedFilters).toBeDefined();
    expect(response.body.hospitals).toBeDefined();
    expect(response.body.extractedFilters.disease).toBe('kidney');
    expect(response.body.extractedFilters.location).toBe('Chandigarh');
    expect(response.body.extractedFilters.budgetMax).toBe(200000);
  });

  test('non-string query returns 400', async () => {
    await request(app).post('/search/nl').send({ query: 123 }).expect(400);
  });

  test('missing body returns 400', async () => {
    await request(app).post('/search/nl').expect(400);
  });

  test('non-medical query returns ZERO hospitals with a message', async () => {
    const response = await request(app)
      .post('/search/nl')
      .send({ query: 'paneer tikka' })
      .expect(200);
    expect(response.body.category).toBe(CLASSIFY.NON_MEDICAL);
    expect(response.body.hospitals).toEqual([]);
    expect(response.body.message).toMatch(/medical/i);
  });

  test('hair transplant returns dermatology hospitals (doctors do this too)', async () => {
    const response = await request(app)
      .post('/search/nl')
      .send({ query: 'best hair transplant in Delhi' })
      .expect(200);
    expect(response.body.category).toBe(CLASSIFY.MEDICAL);
    expect(response.body.extractedFilters.disease).toBe('dermatology');
    expect(response.body.hospitals.length).toBeGreaterThan(0);
    for (const h of response.body.hospitals) {
      expect(h.specialties).toContain('dermatology');
    }
  });
});

describe('POST /search/classify', () => {
  test('food query is non-medical', async () => {
    const response = await request(app)
      .post('/search/classify')
      .send({ query: 'paneer tikka' })
      .expect(200);
    expect(response.body.isMedical).toBe(false);
    expect(response.body.category).toBe(CLASSIFY.NON_MEDICAL);
  });

  test('medical query passes', async () => {
    const response = await request(app)
      .post('/search/classify')
      .send({ query: 'liver transplant needed' })
      .expect(200);
    expect(response.body.isMedical).toBe(true);
  });

  test('non-string query returns 400', async () => {
    await request(app).post('/search/classify').send({ query: 42 }).expect(400);
  });

  test('empty query returns 400', async () => {
    await request(app).post('/search/classify').send({ query: '   ' }).expect(400);
  });
});

describe('GET /hospitals', () => {
  test('returns all hospitals with numeric ids', async () => {
    const response = await request(app).get('/hospitals').expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(30);
    for (const h of response.body) {
      expect(typeof h.id).toBe('number');
    }
  });
});

describe('GET /hospitals/:id', () => {
  test('happy path numeric id', async () => {
    const response = await request(app).get('/hospitals/1').expect(200);
    expect(response.body.id).toBe(1);
    expect(response.body.name).toBeDefined();
  });

  test('not found returns 404', async () => {
    await request(app).get('/hospitals/99999').expect(404);
  });
});

describe('CRUD operations', () => {
  let createdId;

  test('create hospital', async () => {
    const response = await request(app)
      .post('/hospitals')
      .send({
        name: 'Test Hospital',
        city: 'Test City',
        pincode: '123456',
        specialties: ['cardiac'],
        cost_estimate_min: 50000,
        cost_estimate_max: 200000,
        facilities: ['ICU'],
        bed_count: 100,
        accreditation_status: 'NABH Accredited',
        patient_volume: 10000,
      })
      .expect(201);
    createdId = response.body.id;
    expect(typeof createdId).toBe('number');
    expect(response.body.name).toBe('Test Hospital');
  });

  test('created hospital is retrievable by id', async () => {
    const response = await request(app).get(`/hospitals/${createdId}`).expect(200);
    expect(response.body.name).toBe('Test Hospital');
  });

  test('unknown fields are stripped (no id injection)', async () => {
    const response = await request(app)
      .post('/hospitals')
      .send({ name: 'Inject Test', city: 'Test City', specialties: ['cardiac'], id: 9999, hacked: true })
      .expect(201);
    expect(response.body.id).not.toBe(9999);
    expect(response.body.hacked).toBeUndefined();
  });

  test('update hospital', async () => {
    const response = await request(app)
      .put(`/hospitals/${createdId}`)
      .send({ name: 'Updated Name' })
      .expect(200);
    expect(response.body.name).toBe('Updated Name');
  });

  test('update unknown id returns 404', async () => {
    await request(app).put('/hospitals/99999').send({ name: 'x' }).expect(404);
  });

  test('update with empty body returns 400', async () => {
    await request(app).put('/hospitals/1').send({}).expect(400);
  });

  test('delete hospital', async () => {
    await request(app).delete(`/hospitals/${createdId}`).expect(204);
    await request(app).get(`/hospitals/${createdId}`).expect(404);
  });

  test('delete unknown id returns 404', async () => {
    await request(app).delete('/hospitals/99999').expect(404);
  });
});

describe('health + 404', () => {
  test('GET /health returns ok', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  test('unknown route returns JSON 404', async () => {
    const response = await request(app).get('/nonexistent').expect(404);
    expect(response.body.error).toBe('Route not found');
  });
});

describe('data layer direct tests', () => {
  test('create assigns numeric max+1 id', () => {
    const before = dataLayer.getAllHospitals().length;
    const created = dataLayer.createHospital({
      name: 'Direct Layer Test',
      city: 'X City',
      specialties: ['cardiac'],
    });
    expect(typeof created.id).toBe('number');
    expect(dataLayer.getAllHospitals().length).toBe(before + 1);
  });

  test('update and delete round-trip', () => {
    const created = dataLayer.createHospital({ name: 'RT Test', city: 'Y City', specialties: ['cardiac'] });
    const updated = dataLayer.updateHospital(created.id, { name: 'RT Updated' });
    expect(updated.name).toBe('RT Updated');
    expect(dataLayer.deleteHospital(created.id)).toBe(true);
    expect(dataLayer.getHospitalById(created.id)).toBeUndefined();
  });
});
