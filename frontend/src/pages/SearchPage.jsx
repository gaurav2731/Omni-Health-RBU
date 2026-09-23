import { useState, useEffect, useMemo } from 'react';
import HeroSection from '../components/HeroSection';
import HospitalCard from '../components/HospitalCard';
import NLSearch from '../components/NLSearch';
import HospitalMap from '../components/HospitalMap';
import { fetchHospitalsList, searchNL } from '../api';
import { parseQueryToFilters, SPECIALTIES } from '../../../shared/nlParser.js';
import { filterHospitals, rankBySpecialtyRelevance } from '../../../shared/filters.js';

const PEDIATRIC_AGE_MAX = 18;

function SearchPage({ selectedHospitals, onToggleSelection, isSelected }) {
  const [allHospitals, setAllHospitals] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  const [filters, setFilters] = useState({ state: '', disease: '', city: '', budgetMax: '' });
  const [patientAge, setPatientAge] = useState('');
  const [nlFilters, setNlFilters] = useState(null);
  const [nlNotice, setNlNotice] = useState(null);
  // When a non-medical NL query ("chicken", "paneer tikka") is blocked, the
  // results grid itself is replaced by a message — resetting filters to empty
  // would otherwise fall through to showing ALL 55 hospitals, which looked
  // like the search "worked".
  const [suppressedQuery, setSuppressedQuery] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchHospitalsList();
      setAllHospitals(data);
    } catch (err) {
      setLoadError(err.message || 'Could not reach the server. Is the backend running on port 3001?');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react/set-state-in-effect -- async data fetch on mount; setState fires after await, not synchronously
  useEffect(() => {
    loadData();
  }, []);

  // Dropdown options derived from the actual dataset (always in sync).
  const stateOptions = useMemo(
    () => [...new Set(allHospitals.map((h) => h.state).filter(Boolean))].sort(),
    [allHospitals]
  );
  const cityOptions = useMemo(
    () => [...new Set(allHospitals.map((h) => h.city).filter(Boolean))].sort(),
    [allHospitals]
  );

  // Results are DERIVED from filters (single source of truth) — no extra
  // state, no effect cascade. Filters apply live as the user types/selects.
  // Uses the same shared filter logic as the backend search endpoint.
  const displayedHospitals = useMemo(() => {
    let result = filterHospitals(allHospitals, filters);

    if (filters.budgetMax) {
      result.sort((a, b) => a.cost_estimate_min - b.cost_estimate_min);
    } else {
      // PREMIUM MODE (budget cap off): most-rated first, then most premium
      // fee ranges, then patient volume as the final tiebreak.
      result.sort(
        (a, b) =>
          (b.rating || 0) - (a.rating || 0) ||
          (b.cost_estimate_max || 0) - (a.cost_estimate_max || 0) ||
          (b.patient_volume || 0) - (a.patient_volume || 0)
      );
    }

    // Patient age is actually used: children are prioritized toward
    // pediatric-capable hospitals instead of being silently ignored.
    const age = parseInt(patientAge, 10);
    if (Number.isFinite(age) && age > 0 && age < PEDIATRIC_AGE_MAX) {
      result.sort((a, b) => {
        const aPeds = a.specialties?.includes('pediatrics') ? 0 : 1;
        const bPeds = b.specialties?.includes('pediatrics') ? 0 : 1;
        return aPeds - bPeds;
      });
    }

    // Specialty-relevance ranking (same as the backend): dedicated institutes
    // ("Kidney Institute", cath-lab hospitals...) beat generic multispecialty
    // giants, so different diseases surface different hospitals at the top.
    // Applied LAST so it dominates; within a tier the sorts above are kept.
    return rankBySpecialtyRelevance(result, filters.disease);
  }, [allHospitals, filters, patientAge]);

  const handleNLSearch = async (searchData) => {
    const queryText = typeof searchData === 'string' ? searchData : searchData.query || '';

    // Extract filters via the backend NL endpoint (single source of truth).
    // Fall back to the shared local parser if the backend is unreachable,
    // so the demo still works offline.
    let extracted = null;
    if (queryText) {
      try {
        const res = await searchNL(queryText);
        extracted = res.extractedFilters;
      } catch {
        extracted = parseQueryToFilters(queryText);
      }
    }

    const budgetVal = searchData.isBudgetOn && searchData.budgetMax
      ? searchData.budgetMax
      : extracted?.budgetMax || null;

    // Hard gate: non-medical queries ("chicken", "paneer tikka") suppress the
    // results grid entirely — filters reset alone would fall through to
    // showing all hospitals below the notice.
    if (extracted?.nonMedical) {
      setNlNotice(
        `🚫 "${queryText}" is not a medical query. This search shows hospitals ONLY for illness, transplant, checkup, injury, or emergency.`
      );
      setSuppressedQuery(queryText);
      setNlFilters(null);
      setFilters({ state: '', disease: '', city: '', budgetMax: '' });
      setPatientAge('');
      return;
    }
    setNlNotice(null);
    setSuppressedQuery(null);

    if (queryText || searchData.isBudgetOn) {
      setNlFilters({
        disease: extracted?.disease || null,
        location: extracted?.location || null,
        budgetMax: budgetVal,
      });
    }

    if (searchData.patientAge) setPatientAge(String(searchData.patientAge));

    setFilters((f) => ({
      ...f,
      disease: extracted?.disease || f.disease,
      city: extracted?.location || f.city,
      budgetMax: budgetVal ? String(budgetVal) : '',
    }));

    const el = document.getElementById('search-results');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearFilters = () => {
    setFilters({ state: '', disease: '', city: '', budgetMax: '' });
    setNlFilters(null);
    setPatientAge('');
    setNlNotice(null);
    setSuppressedQuery(null);
  };

  // Manual dropdown/input changes lift the suppression — the user is clearly
  // browsing hospitals on their own at that point.
  const updateFilter = (key, value) => {
    setSuppressedQuery(null);
    setNlNotice(null);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const hasActiveFilters = filters.state || filters.disease || filters.city || filters.budgetMax;

  return (
    <div className="search-page">
      {/* Asymmetric Hero Section */}
      <HeroSection onSearchClick={() => {
        const el = document.getElementById('search-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }} />

      <section id="search-section" className="section" style={{ marginTop: 24 }}>
        <div className="section-header" style={{ marginBottom: 20 }}>
          <div>
            <h2 className="section-title">All-India Hospital Discovery Platform</h2>
            <p className="section-subtitle">Search {allHospitals.length || '55+'} institutions by specialty, location, and fees</p>
          </div>
          {hasActiveFilters && (
            <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
              Clear All Filters
            </button>
          )}
        </div>

        {loadError && (
          <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, color: '#fca5a5', marginBottom: 16, fontSize: '0.875rem' }}>
            {loadError}{' '}
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} onClick={loadData}>Retry</button>
          </div>
        )}

        {/* Natural Language Search Card */}
        <NLSearch onSearch={handleNLSearch} />

        {nlNotice && (
          <div role="alert" style={{ padding: 12, background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: 6, color: '#fcd34d', marginBottom: 16, fontSize: '0.875rem' }}>
            {nlNotice}
          </div>
        )}

        {nlFilters && hasActiveFilters && (
          <div className="extracted-filters-bar" data-testid="extracted-filters" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Applied Filters:</span>
            {filters.disease && (
              <span className="city-badge">Specialty: {filters.disease}</span>
            )}
            {filters.city && (
              <span className="city-badge">City: {filters.city}</span>
            )}
            {filters.state && (
              <span className="city-badge">State: {filters.state}</span>
            )}
            {filters.budgetMax && (
              <span className="city-badge" style={{ background: 'rgba(18, 167, 136, 0.15)', borderColor: 'rgba(18, 167, 136, 0.3)', color: 'var(--secondary-mint)' }}>
                Budget ≤ ₹{parseInt(filters.budgetMax, 10).toLocaleString()}
              </span>
            )}
            {patientAge && (
              <span className="city-badge">Patient Age: {patientAge}</span>
            )}
          </div>
        )}

        {/* Filters Grid — applies live, no submit needed */}
        <div className="filter-form-grid" data-testid="filter-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, alignItems: 'end' }}>
          <div className="filter-group">
            <label htmlFor="state" className="form-label">State</label>
            <select
              id="state"
              className="form-select"
              value={filters.state}
              onChange={(e) => updateFilter('state', e.target.value)}
            >
              <option value="">All Indian States</option>
              {stateOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="disease" className="form-label">Specialty / Disease</label>
            <select
              id="disease"
              className="form-select"
              value={filters.disease}
              onChange={(e) => updateFilter('disease', e.target.value)}
              aria-label="Disease/Specialty"
            >
              <option value="">All Diseases &amp; Specialties</option>
              {SPECIALTIES.map(d => (
                <option key={d} value={d}>{d.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="city" className="form-label">City</label>
            <select
              id="city"
              className="form-select"
              value={filters.city}
              onChange={(e) => updateFilter('city', e.target.value)}
              aria-label="City"
            >
              <option value="">All Cities</option>
              {cityOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="budgetMax" className="form-label">Max Budget (₹)</label>
            <input
              type="number"
              id="budgetMax"
              className="form-input"
              placeholder="e.g. 200000"
              value={filters.budgetMax}
              onChange={(e) => updateFilter('budgetMax', e.target.value)}
              aria-label="Max Budget (₹)"
            />
          </div>
        </div>
      </section>

      {/* Hospital Results & View Switcher (Grid vs Interactive Map) */}
      <section id="search-results" className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {loading ? 'Loading Hospitals...' : suppressedQuery ? 'No Results Shown' : `Showing ${displayedHospitals.length} Facilities`}
            </h2>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Selected for comparison: {selectedHospitals.length}/3
            </span>
          </div>

          {/* Grid vs Map View Pill Switcher — real buttons for a11y */}
          <div className="pill-switch" role="group" aria-label="Result view mode">
            <button
              type="button"
              className={`pill-switch-opt ${viewMode === 'grid' ? 'active' : ''}`}
              aria-pressed={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Grid View
            </button>

            <button
              type="button"
              className={`pill-switch-opt ${viewMode === 'map' ? 'active' : ''}`}
              aria-pressed={viewMode === 'map'}
              onClick={() => setViewMode('map')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
              Interactive Map View
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <span className="spinner" />
            <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading hospital records...</p>
          </div>
        ) : suppressedQuery ? (
          // Non-medical NL query blocked: NO hospital list at all — just the
          // message and a way back. ("chicken" must not "entertain" with
          // 55 unrelated hospitals below the notice.)
          <div style={{ textAlign: 'center', padding: 48, background: 'var(--bg-input)', borderRadius: 10, border: '1px solid rgba(245, 158, 11, 0.35)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }} aria-hidden>🚫</div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Hospitals are not shown for non-medical searches
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 520, margin: '8px auto 0' }}>
              This platform lists hospitals only for illness, transplant, checkup,
              injury, or emergency. Try a medical query like “kidney treatment in
              Chandigarh under 2 lakh”.
            </p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={clearFilters}>
              Show All Hospitals
            </button>
          </div>
        ) : displayedHospitals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-soft)' }}>No hospitals match your selected criteria.</p>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={clearFilters}>
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'map' ? (
          <HospitalMap
            hospitals={displayedHospitals}
            selectedHospitals={selectedHospitals}
            onToggleSelection={onToggleSelection}
          />
        ) : (
          <div className="hospital-grid" role="list">
            {displayedHospitals.map(h => (
              <HospitalCard
                key={h.id}
                hospital={h}
                selected={isSelected(h)}
                onToggle={onToggleSelection}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SearchPage;
