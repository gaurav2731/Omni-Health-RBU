import { memo, useMemo } from 'react';
import './PatientReviews.css';

// ---------------------------------------------------------------------------
// PATIENT REVIEWS — hospital profile section
//
// IMPORTANT: every number is PLACEHOLDER/SAMPLE data for the demo. No real
// patient survey exists. Values are generated deterministically from each
// hospital's id/name (seeded PRNG), so every hospital shows DIFFERENT but
// STABLE numbers — the same hospital always shows the same figures.
// Higher-rated hospitals (rating >= 4.8) get a slightly higher band, so the
// spread looks plausible next to the star rating.
// ---------------------------------------------------------------------------

const REVIEW_CATEGORIES = [
  'Staff Behaviour',
  'Doctor Communication',
  'Treatment Satisfaction',
  'Cleanliness',
  'Comfort & Care',
  'Waiting Experience',
];

const OVERALL_CATEGORIES = [
  'Satisfied Patients',
  'Would Recommend',
  'Positive Reviews',
];

// One 4px block ≈ 10% → 10 blocks per row.
const BLOCKS_PER_BAR = 10;

// FNV-1a string hash → 32-bit seed (stable across renders/sessions).
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 PRNG — tiny, deterministic, good enough for demo data.
function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Value band shifts with the hospital's star rating so premium institutes
// skew higher and budget ones lower — visible variety across cards.
function bandForRating(rating) {
  if (rating >= 4.8) return [78, 97];
  if (rating >= 4.5) return [74, 93];
  return [70, 88];
}

function buildRows(categories, seed, rating) {
  const [low, high] = bandForRating(rating);
  const rand = mulberry32(seed);
  return categories.map((label) => ({
    label,
    value: low + Math.floor(rand() * (high - low + 1)),
  }));
}

function ReviewBar({ label, value }) {
  // Round to the nearest block so a single block always means ~10%.
  const filled = Math.round((Math.min(100, Math.max(0, value)) / 100) * BLOCKS_PER_BAR);

  return (
    <div className="review-row">
      <span className="review-row-label">{label}</span>
      <div
        className="review-bar"
        role="img"
        aria-label={`${label}: ${value} percent`}
      >
        {Array.from({ length: BLOCKS_PER_BAR }, (_, i) => (
          <span
            key={i}
            className={`review-block ${i < filled ? 'filled' : ''}`}
          />
        ))}
      </div>
      <span className="review-row-value">{value}%</span>
    </div>
  );
}

function PatientReviews({ hospital }) {
  const name = hospital?.name || 'Unknown Hospital';
  const rating = hospital?.rating || 0;

  // Deterministic per-hospital sample data (see header comment).
  const reviewRows = useMemo(
    () => buildRows(REVIEW_CATEGORIES, hashString(`${name}::reviews`), rating),
    [name, rating]
  );
  const overallRows = useMemo(
    () => buildRows(OVERALL_CATEGORIES, hashString(`${name}::overall`), rating),
    [name, rating]
  );

  return (
    <section className="patient-reviews" aria-label="Patient reviews (sample data)">
      <div className="reviews-header">
        <h3 className="reviews-title">PATIENT REVIEWS</h3>
        <span className="reviews-sample-badge">Sample data</span>
      </div>

      <div className="reviews-grid">
        <div className="reviews-group">
          {reviewRows.map((r) => (
            <ReviewBar key={r.label} label={r.label} value={r.value} />
          ))}
        </div>

        <div className="reviews-group reviews-group-overall">
          <h4 className="reviews-subtitle">OVERALL EXPERIENCE</h4>
          {overallRows.map((r) => (
            <ReviewBar key={r.label} label={r.label} value={r.value} />
          ))}
        </div>
      </div>

      <p className="reviews-disclaimer">
        Illustrative percentages shown for demonstration purposes only — not
        real patient survey results.
      </p>
    </section>
  );
}

export default memo(PatientReviews);
