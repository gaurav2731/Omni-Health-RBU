import { useState } from 'react';
import { useModalBehavior } from '../lib/modalBehavior';

function HelplineModal({ isOpen, onClose }) {
  useModalBehavior(isOpen, onClose);

  const [language, setLanguage] = useState('hi'); // 'hi', 'pb', 'en'
  const [triageLevel, setTriageLevel] = useState('nurse'); // 'nurse', 'doctor'
  const [callInitiated, setCallInitiated] = useState(false);

  if (!isOpen) return null;

  const languages = [
    { code: 'hi', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
    { code: 'pb', label: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🌾' },
    { code: 'en', label: 'English', flag: '🌐' }
  ];

  const handleCall = () => {
    setCallInitiated(true);
    setTimeout(() => {
      window.location.href = "tel:18008899999";
    }, 600);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              24x7 Emergency Medical Helpline
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>
              Choose your preferred language & consultation level
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Step 1: Language Selection */}
          <div style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ marginBottom: 10 }}>Select Preferred Language</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {languages.map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  className={`btn ${language === lang.code ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setLanguage(lang.code)}
                  style={{ justifyContent: 'center', fontSize: '0.8125rem' }}
                >
                  <span>{lang.flag}</span> {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Consultation Level Triage */}
          <div style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ marginBottom: 10 }}>Select Consultation Level</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  border: `1px solid ${triageLevel === 'nurse' ? 'var(--primary-blue)' : 'var(--border-subtle)'}`,
                  background: triageLevel === 'nurse' ? 'rgba(36, 82, 166, 0.15)' : 'var(--bg-input)',
                  cursor: 'pointer'
                }}
                onClick={() => setTriageLevel('nurse')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Nurse Helpline (General Triage)</strong>
                  <input type="radio" checked={triageLevel === 'nurse'} readOnly />
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Connect with registered nursing staff for routine symptoms, first-aid advice, and hospital booking guidance.
                </p>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  border: `1px solid ${triageLevel === 'doctor' ? 'var(--urgent-red)' : 'var(--border-subtle)'}`,
                  background: triageLevel === 'doctor' ? 'var(--urgent-banner-bg)' : 'var(--bg-input)',
                  cursor: 'pointer'
                }}
                onClick={() => setTriageLevel('doctor')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#fca5a5' }}>Emergency Doctor Line (Severe Cases)</strong>
                  <input type="radio" checked={triageLevel === 'doctor'} readOnly />
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Direct priority line to On-Duty Senior Specialist Doctors for severe, critical, or emergency care cases.
                </p>
              </div>
            </div>
          </div>

          {/* Call Trigger Box */}
          <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 10, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Toll-Free Helpline Number</p>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-accent-blue)', margin: '4px 0' }}>
              1800-889-9999
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Language: {languages.find(l => l.code === language)?.label} • Mode: {triageLevel === 'doctor' ? 'Senior Specialist Doctor' : 'Nurse Triage'}
            </p>

            <button
              className={`btn ${triageLevel === 'doctor' ? 'btn-danger' : 'btn-primary'}`}
              style={{ width: '100%', marginTop: 14 }}
              onClick={handleCall}
            >
              {callInitiated ? <span className="spinner" /> : 'Connect Free Call Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelplineModal;

