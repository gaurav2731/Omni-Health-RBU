function HeroSection({ onSearchClick }) {
  return (
    <div className="hero-wrapper">
      <div className="hero-container">
        {/* Left Headline & Call to Action */}
        <div>
          <h1 className="hero-headline">
            Transparent Hospital Search & Medical Discovery <span>Across India</span>
          </h1>
          <p className="hero-body">
            Compare cost estimates, bed counts, and NABH accreditation metrics for medical institutions with clear, side-by-side guidance.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={onSearchClick}>
              Explore Hospitals
            </button>
            <a href="tel:18008899999" className="btn btn-secondary">
              24x7 Doctor Line
            </a>
          </div>
        </div>

        {/* Right Illustration Card with Flat-style SVG & Stats */}
        <div className="hero-illustration-card">
          <svg viewBox="0 0 400 210" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', borderRadius: 8 }}>
            {/* Background Canvas */}
            <rect width="400" height="210" rx="8" fill="#0A101B" />
            
            {/* Hospital Building (#2452A6) */}
            <rect x="110" y="45" width="180" height="135" rx="6" fill="#162032" stroke="#2452A6" strokeWidth="2" />
            <rect x="175" y="25" width="50" height="20" rx="4" fill="#2452A6" />
            {/* Medical Cross Symbol */}
            <path d="M194 30h12v10h-12zM195 29h10v12h-10z" fill="#ffffff" />

            {/* Building Windows */}
            <rect x="130" y="65" width="22" height="22" rx="3" fill="#24324a" />
            <rect x="165" y="65" width="22" height="22" rx="3" fill="#24324a" />
            <rect x="213" y="65" width="22" height="22" rx="3" fill="#24324a" />
            <rect x="248" y="65" width="22" height="22" rx="3" fill="#24324a" />

            <rect x="130" y="100" width="22" height="22" rx="3" fill="#24324a" />
            <rect x="165" y="100" width="22" height="22" rx="3" fill="#2452A6" opacity="0.6" />
            <rect x="213" y="100" width="22" height="22" rx="3" fill="#24324a" />
            <rect x="248" y="100" width="22" height="22" rx="3" fill="#24324a" />

            {/* Entrance Door */}
            <rect x="182" y="140" width="36" height="40" rx="4" fill="#2452A6" />

            {/* Ambulance Vehicle (#DD4B3B & #ffffff) */}
            <g transform="translate(30, 135)">
              <rect x="0" y="15" width="75" height="32" rx="5" fill="#ffffff" />
              <path d="M52 15h18l8 14v18h-26V15z" fill="#DDE6F0" />
              {/* Emergency Red Cross on Ambulance */}
              <rect x="22" y="25" width="12" height="4" fill="#DD4B3B" />
              <rect x="26" y="21" width="4" height="12" fill="#DD4B3B" />
              {/* Wheels */}
              <circle cx="18" cy="47" r="8" fill="#101827" stroke="#8A96AC" strokeWidth="2" />
              <circle cx="58" cy="47" r="8" fill="#101827" stroke="#8A96AC" strokeWidth="2" />
              {/* Urgent Light Bar */}
              <rect x="40" y="10" width="8" height="5" rx="2" fill="#DD4B3B" />
            </g>

            {/* Green Trees / Mint Accents (#12A788) */}
            <circle cx="75" cy="155" r="14" fill="#12A788" opacity="0.8" />
            <circle cx="325" cy="155" r="16" fill="#12A788" opacity="0.8" />
          </svg>

          {/* Stats Row */}
          <div className="hero-stats-row">
            <div>
              <div className="hero-stat-num">55+</div>
              <div className="hero-stat-label">Hospitals (Demo Data)</div>
            </div>
            <div>
              <div className="hero-stat-num">11</div>
              <div className="hero-stat-label">States Covered</div>
            </div>
            <div>
              <div className="hero-stat-num">24x7</div>
              <div className="hero-stat-label">Helpline Support</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
