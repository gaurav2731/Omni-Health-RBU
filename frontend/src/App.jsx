import { useState, useEffect, useCallback } from 'react';
import SearchPage from './pages/SearchPage';
import ComparisonPage from './pages/ComparisonPage';
import AdminPage from './pages/AdminPage';
import AuthModal from './components/AuthModal';
import HelplineModal from './components/HelplineModal';
import AIChatbot from './components/AIChatbot';
import Toast from './components/Toast';
import { fetchHospitalsList } from './api';
import { AuthService } from './auth';
import './App.css';

const MAX_COMPARE = 3;

function App() {
  const [view, setView] = useState('search'); // 'search', 'comparison', 'admin'
  const [selectedHospitals, setSelectedHospitals] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  // Lazy init: restore session at first render, no effect/setState cascade.
  const [currentUser, setCurrentUser] = useState(() => AuthService.getCurrentUser());
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHelplineOpen, setIsHelplineOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const loadHospitals = useCallback(async () => {
    try {
      const list = await fetchHospitalsList();
      setHospitalsList(list);
    } catch (err) {
      // The AI assistant's dataset is optional; search page surfaces the error.
      console.warn('Could not load hospitals for AI assistant:', err.message);
      setHospitalsList([]);
    }
  }, []);

  // eslint-disable-next-line react/set-state-in-effect -- async data fetch on mount; setState fires after await, not synchronously
  useEffect(() => {
    loadHospitals();
  }, [loadHospitals]);

  const showToast = useCallback((message, tone = 'success') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  const closeToast = useCallback(() => setToast(null), []);

  const toggleHospitalSelection = useCallback((hospital) => {
    setSelectedHospitals((prev) => {
      if (prev.some((h) => h.id === hospital.id)) {
        return prev.filter((h) => h.id !== hospital.id);
      }
      return prev.length >= MAX_COMPARE ? prev : [...prev, hospital];
    });
  }, []);

  const isSelected = useCallback(
    (hospital) => selectedHospitals.some((h) => h.id === hospital.id),
    [selectedHospitals]
  );

  const handleToggleSelection = useCallback(
    (hospital) => {
      if (!isSelected(hospital) && selectedHospitals.length >= MAX_COMPARE) {
        showToast(`You can compare up to ${MAX_COMPARE} hospitals at a time.`, 'error');
        return;
      }
      toggleHospitalSelection(hospital);
    },
    [isSelected, selectedHospitals.length, toggleHospitalSelection, showToast]
  );

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
    if (view === 'admin') setView('search');
  };

  return (
    <div className="app">
      {/* 24x7 Emergency Helpline Top Bar (Coral-Red Urgent Tint) */}
      <div className="utility-emergency-bar">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        <span>24x7 Multi-Language Emergency Helpline (Hindi • Punjabi • English)</span>
        <button
          className="utility-emergency-link"
          onClick={() => setIsHelplineOpen(true)}
        >
          Call Emergency Triage (1800-889-9999)
        </button>
      </div>

      {/* Modern Restrained Header */}
      <header className="header">
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="/" className="logo" onClick={(e) => { e.preventDefault(); setView('search'); }}>
              <span className="logo-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              Omni Health
            </a>

            <span
              title="All hospital records are synthetic demo data for this MVP"
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.4px',
                padding: '2px 8px',
                borderRadius: 999,
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#f59e0b',
                textTransform: 'uppercase',
              }}
            >
              Demo Data
            </span>

            <nav className="nav-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={view === 'search'}
                className={`nav-tab ${view === 'search' ? 'active' : ''}`}
                onClick={() => setView('search')}
              >
                Hospital Search
              </button>
              <button
                role="tab"
                aria-selected={view === 'comparison'}
                className={`nav-tab ${view === 'comparison' ? 'active' : ''}`}
                onClick={() => setView('comparison')}
                disabled={selectedHospitals.length < 2}
              >
                Compare Matrix ({selectedHospitals.length})
              </button>
              <button
                role="tab"
                aria-selected={view === 'admin'}
                className={`nav-tab ${view === 'admin' ? 'active' : ''}`}
                onClick={() => setView('admin')}
              >
                Admin Management
              </button>
            </nav>
          </div>

          <div>
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {currentUser.displayName || currentUser.email} ({currentUser.role})
                </span>
                <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                  Log Out
                </button>
              </div>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => setIsAuthOpen(true)}>
                Log In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main">
        {view === 'search' && (
          <SearchPage
            selectedHospitals={selectedHospitals}
            onToggleSelection={handleToggleSelection}
            isSelected={isSelected}
          />
        )}
        {view === 'comparison' && (
          <ComparisonPage
            hospitals={selectedHospitals}
            onBack={() => setView('search')}
          />
        )}
        {view === 'admin' && (
          <AdminPage
            user={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>

      {/* Restrained Floating AI Search Widget */}
      <div className="chatbot-widget">
        {!isChatOpen && (
          <button className="chatbot-toggle-btn" onClick={() => setIsChatOpen(true)} title="AI Health Assistant">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}

        {isChatOpen && (
          <AIChatbot
            hospitals={hospitalsList}
            onSelectForCompare={(h) => {
              if (!isSelected(h) && selectedHospitals.length >= MAX_COMPARE) {
                showToast(`You can compare up to ${MAX_COMPARE} hospitals at a time.`, 'error');
                return;
              }
              if (!isSelected(h)) showToast(`Added ${h.name} to comparison list.`);
              toggleHospitalSelection(h);
            }}
            isFloating={true}
            onClose={() => setIsChatOpen(false)}
            onOpenHelpline={() => setIsHelplineOpen(true)}
          />
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'admin') setView('admin');
        }}
      />

      {/* 24x7 Multi-Language Helpline Modal */}
      <HelplineModal
        isOpen={isHelplineOpen}
        onClose={() => setIsHelplineOpen(false)}
      />

      {/* Transient status toast (replaces alert()) */}
      <Toast message={toast?.message} tone={toast?.tone} onDone={closeToast} />
    </div>
  );
}

export default App;
