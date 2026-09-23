import { useState } from 'react';

function NLSearch({ onSearch }) {
  const [query, setQuery] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [isBudgetOn, setIsBudgetOn] = useState(false);
  const [budgetMax, setBudgetMax] = useState('');

  const buildPayload = (overrides = {}) => ({
    query: query.trim(),
    patientAge: patientAge ? parseInt(patientAge, 10) : null,
    isBudgetOn,
    budgetMax: isBudgetOn && budgetMax ? parseInt(budgetMax, 10) : null,
    ...overrides,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(buildPayload());
  };

  const handleChipClick = (sq) => {
    setQuery(sq);
    onSearch(buildPayload({ query: sq }));
  };

  const sampleQueries = [
    'kidney treatment near Chandigarh under 2 lakh',
    'heart surgery in Delhi under ₹500000',
    'knee replacement Mumbai 3 lakh budget',
    'best cardiac hospital in Bangalore'
  ];

  return (
    <div className="search-card" data-testid="nl-search-form">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Natural Language Hospital Search
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
        Describe your required treatment or select from suggested queries below.
      </p>

      {/* Main Search Input + Primary Button */}
      <form onSubmit={handleSubmit} className="search-card-form">
        <input
          type="text"
          className="form-input"
          placeholder="e.g., kidney treatment near Chandigarh under 2 lakh..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Natural language search query"
        />
        <button type="submit" className="btn btn-primary">
          Search Hospitals
        </button>
      </form>

      {/* Suggested Query Chips */}
      <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Suggested:</span>
        {sampleQueries.map((sq, idx) => (
          <button
            key={idx}
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => handleChipClick(sq)}
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Refine Row with Patient Age & Pill Budget Switch */}
      <div className="refine-row">
        {/* Field 1: Patient Age */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label
            htmlFor="nl-patient-age"
            style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}
          >
            Patient Age:
          </label>
          <input
            type="number"
            id="nl-patient-age"
            className="form-input"
            placeholder="e.g., 45"
            style={{ width: 110 }}
            value={patientAge}
            onChange={(e) => setPatientAge(e.target.value)}
            min="1"
            max="120"
          />
        </div>

        {/* Field 2: Budget Switch Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Budget Cap:
          </span>

          <div className="pill-switch" role="group" aria-label="Budget cap toggle">
            <button
              type="button"
              className={`pill-switch-opt ${!isBudgetOn ? 'active' : ''}`}
              aria-pressed={!isBudgetOn}
              onClick={() => setIsBudgetOn(false)}
            >
              OFF
            </button>
            <button
              type="button"
              className={`pill-switch-opt ${isBudgetOn ? 'active' : ''}`}
              aria-pressed={isBudgetOn}
              onClick={() => setIsBudgetOn(true)}
            >
              ON
            </button>
          </div>

          {/* Conditional Display based on Budget Toggle state */}
          {isBudgetOn ? (
            <input
              type="number"
              className="form-input"
              placeholder="Set a budget (₹)"
              style={{ width: 170 }}
              aria-label="Budget cap amount in rupees"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />
          ) : (
            <span className="mint-note">
              ✓ Premium mode: highest-rated hospitals with premium fee ranges, no budget cap.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default NLSearch;
