import { useState } from 'react';

function HospitalMap({ hospitals = [], selectedHospitals = [], onToggleSelection }) {
  // Track only the ID and DERIVE the object from the current (filtered) list.
  // If the active hospital gets filtered out, the popup closes automatically
  // during render — no effect, no stale data possible.
  const [activeId, setActiveId] = useState(null);
  const activeHospital = activeId != null ? hospitals.find((h) => h.id === activeId) ?? null : null;

  // Projection helper: maps lat/long coordinates to map SVG canvas (width 800, height 500)
  // India Bounding Box approx: lat 8 to 35, long 68 to 92
  const mapCoords = (lat, long) => {
    const x = ((long - 68) / (92 - 68)) * 740 + 30;
    const y = 470 - ((lat - 8) / (35 - 8)) * 440;
    return { x, y };
  };

  return (
    <div className="map-container">
      {/* Map Control Bar */}
      <div style={{ padding: '12px 18px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
            All-India Interactive Hospital Map ({hospitals.length} Mapped Facilities)
          </span>
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Click any pin on the map to inspect facility details
        </span>
      </div>

      {/* SVG Canvas Map */}
      <svg className="map-canvas-svg" viewBox="0 0 800 500">
        {/* Subtle Map Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1c283c" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="800" height="500" fill="url(#grid)" />

        {/* State / Region Text Labels */}
        <text x="180" y="80" fill="#24324a" fontSize="12" fontWeight="700">NORTH (Delhi/Punjab/UT)</text>
        <text x="140" y="270" fill="#24324a" fontSize="12" fontWeight="700">WEST (MH/Gujarat/RJ)</text>
        <text x="270" y="390" fill="#24324a" fontSize="12" fontWeight="700">SOUTH (KA/TN/TS/Kerala)</text>
        <text x="560" y="220" fill="#24324a" fontSize="12" fontWeight="700">EAST (West Bengal)</text>

        {/* Plot Pins for each Hospital */}
        {hospitals.map((h) => {
          const { x, y } = mapCoords(h.lat ?? 20, h.long ?? 78);
          const isSelected = selectedHospitals.some(sh => sh.id === h.id);
          const isActive = activeHospital && activeHospital.id === h.id;

          return (
            <g
              key={h.id}
              className="map-pin"
              onClick={() => setActiveId(h.id)}
              transform={`translate(${x}, ${y})`}
            >
              {/* Outer Pulse ring if active */}
              {isActive && (
                <circle r="12" fill="none" stroke="var(--primary-blue)" strokeWidth="1.5" opacity="0.8">
                  <animate attributeName="r" values="8;18;8" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Pin Base Circle */}
              <circle
                r={isActive ? "7" : isSelected ? "6" : "4.5"}
                fill={isSelected ? "var(--secondary-mint)" : isActive ? "var(--primary-blue)" : "#3b82f6"}
                stroke="#ffffff"
                strokeWidth={isActive ? "2" : "1"}
              />
            </g>
          );
        })}
      </svg>

      {/* Selected Hospital Popup Detail Card on Map */}
      {activeHospital && (
        <div className="map-popup-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="city-badge" style={{ marginBottom: 4 }}>{activeHospital.city}, {activeHospital.state}</span>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: '2px 0' }}>{activeHospital.name}</h4>
            </div>
            <span style={{ fontSize: '0.8125rem', color: '#f59e0b', fontWeight: 700 }}>★ {activeHospital.rating || 4.7}</span>
          </div>

          <div style={{ margin: '8px 0', fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>
            Cost Range: <strong className="cost-range" style={{ fontSize: '0.875rem' }}>₹{activeHospital.cost_estimate_min.toLocaleString()} - ₹{activeHospital.cost_estimate_max.toLocaleString()}</strong>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            {activeHospital.bed_count} Beds • {activeHospital.accreditation_status}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={() => onToggleSelection && onToggleSelection(activeHospital)}
            >
              {selectedHospitals.some(sh => sh.id === activeHospital.id) ? '✓ Selected' : 'Compare Hospital'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setActiveId(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HospitalMap;
