import { memo } from 'react';
import { formatCost, formatNumber } from '../lib/format';

function HospitalCard({ hospital, selected, onToggle }) {
  // Calls onToggle WITH the hospital so the parent can pass one stable
  // callback for all cards (keeps the memo() below effective).
  const handleToggle = () => onToggle(hospital);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <article
      className={`hospital-card ${selected ? 'selected' : ''}`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      role="listitem"
      aria-selected={selected}
      tabIndex={0}
      aria-label={`${hospital.name}, ${hospital.city}. ${selected ? 'Currently selected for comparison' : 'Press Enter to select for comparison'}`}
    >
      <div className="hospital-card-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {hospital.rating >= 4.8 && (
              <span className="tag" style={{ background: 'rgba(18, 167, 136, 0.15)', borderColor: 'rgba(18, 167, 136, 0.3)', color: 'var(--secondary-mint)', fontSize: '0.7rem', fontWeight: 700 }}>
                Top Premium Institute
              </span>
            )}
            <span className="city-badge">{hospital.city}</span>
          </div>
          <h3 className="hospital-name">{hospital.name}</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>{hospital.state} • Pincode {hospital.pincode}</p>
        </div>

        {/* Rating Badge */}
        <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
            ★ {hospital.rating || 'N/A'}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Rating</span>
        </div>
      </div>

      <div style={{ margin: '12px 0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {(hospital.specialties || []).map(s => (
            <span key={s} className="tag tag-primary">{s}</span>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Estimated Cost Range</span>
          <span className="cost-range">{formatCost(hospital.cost_estimate_min, hospital.cost_estimate_max)}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '8px 0' }}>
          {(hospital.facilities || []).slice(0, 3).map(f => (
            <span key={f} className="tag">{f}</span>
          ))}
          {Array.isArray(hospital.facilities) && hospital.facilities.length > 3 && (
            <span className="tag">+{hospital.facilities.length - 3} more</span>
          )}
        </div>

        <div className="metrics-row">
          <div className="metric">
            <span className="metric-value">{formatNumber(hospital.bed_count)}</span>
            <span className="metric-label">Beds</span>
          </div>
          <div className="metric">
            <span className="metric-value" style={{ fontSize: '0.78rem' }}>{hospital.accreditation_status || 'N/A'}</span>
            <span className="metric-label">Status</span>
          </div>
          <div className="metric">
            <span className="metric-value">{formatNumber(hospital.patient_volume)}</span>
            <span className="metric-label">Annual Patients</span>
          </div>
        </div>
      </div>

      <div className="hospital-footer">
        <label className="checkbox-wrapper">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleToggle}
            onClick={(e) => e.stopPropagation()}
            aria-label={selected ? `Remove ${hospital.name} from comparison` : `Add ${hospital.name} to comparison`}
          />
          <span>
            {selected ? '✓ Selected for comparison' : 'Compare hospital'}
          </span>
        </label>
      </div>
    </article>
  );
}

// Memoized: re-selecting one hospital no longer re-renders all 55 cards.
export default memo(HospitalCard);
