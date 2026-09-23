import { formatCost, formatNumber } from '../lib/format';

function ComparisonPage({ hospitals, onBack }) {
  if (hospitals.length < 2) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: 50 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>Select Hospitals to Compare</h2>
        <p style={{ color: 'var(--text-subtle)', marginBottom: 18, fontSize: '0.875rem' }}>
          Please select at least 2 hospitals from the search page to view a side-by-side comparison.
        </p>
        <button className="btn btn-primary" onClick={onBack}>Back to Search</button>
      </div>
    );
  }

  const metrics = [
    { key: 'rating', label: 'Star Rating', render: (h) => (h.rating ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>★ {h.rating} / 5.0</span> : 'Not rated') },
    { key: 'state', label: 'State & City', render: (h) => `${h.city}${h.state ? `, ${h.state}` : ''}` },
    { key: 'specialties', label: 'Specialties', render: (h) => (Array.isArray(h.specialties) ? h.specialties.map(s => <span key={s} className="tag tag-primary">{s}</span>) : 'N/A') },
    { key: 'cost', label: 'Fees Estimate Range', render: (h) => <span className="cost-range">{formatCost(h.cost_estimate_min, h.cost_estimate_max)}</span> },
    { key: 'facilities', label: 'Key Facilities', render: (h) => (Array.isArray(h.facilities) ? h.facilities.map(f => <span key={f} className="tag">{f}</span>) : 'N/A') },
    { key: 'bed_count', label: 'Bed Count', render: (h) => formatNumber(h.bed_count) },
    { key: 'accreditation_status', label: 'Accreditation', render: (h) => h.accreditation_status || 'N/A' },
    { key: 'patient_volume', label: 'Patient Volume/yr', render: (h) => formatNumber(h.patient_volume) },
  ];

  return (
    <div className="comparison-page">
      <div className="section">
        <div className="section-header">
          <div>
            <h1 className="section-title">Hospital Comparison Matrix</h1>
            <p className="section-subtitle">Side-by-side comparison of {hospitals.length} selected hospitals</p>
          </div>
          <button className="btn btn-secondary" onClick={onBack}>
            Back to Search
          </button>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th style={{ width: 170 }}>Metric</th>
                {hospitals.map(h => (
                  <th key={h.id}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{h.name}</div>
                    <span className="city-badge" style={{ marginTop: 4 }}>{h.city}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map(m => (
                <tr key={m.key}>
                  <td className="metric-row-label"><strong>{m.label}</strong></td>
                  {hospitals.map(h => (
                    <td key={h.id}>
                      {m.render ? m.render(h) : h[m.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ComparisonPage;
