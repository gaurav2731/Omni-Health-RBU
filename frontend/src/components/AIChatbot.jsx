import { useState, useRef, useEffect } from 'react';
import { parseQueryToFilters } from '../../../shared/nlParser.js';
import { classifyQuery } from '../../../shared/medicalClassifier.js';
import { rankBySpecialtyRelevance } from '../../../shared/filters.js';
import { classifyQueryAPI } from '../api';

function AIChatbot({ hospitals = [], onSelectForCompare, isFloating = true, onClose, onOpenHelpline }) {
  const [wizardStep, setWizardStep] = useState(1); // Step 1: Treatment, Step 2: Age, Step 3: Budget Toggle & Results
  const [diseaseInput, setDiseaseInput] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [isBudgetOn, setIsBudgetOn] = useState(true);
  const [budgetValue, setBudgetValue] = useState('200000');
  
  const [recommendations, setRecommendations] = useState([]);
  const [summaryText, setSummaryText] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (wizardStep === 3) scrollToBottom();
  }, [wizardStep, recommendations]);

  const [isCheckingQuery, setIsCheckingQuery] = useState(false);
  const [step1Error, setStep1Error] = useState('');

  // Gate at Step 1 itself: non-medical input ("paneer tikka") is rejected
  // before the user even reaches the age/budget steps.
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    const query = diseaseInput.trim();
    if (!query || isCheckingQuery) return;

    setIsCheckingQuery(true);
    setStep1Error('');
    let isMedical;
    try {
      const res = await classifyQueryAPI(query);
      isMedical = !!res.isMedical;
    } catch {
      // Backend down -> shared local classifier keeps the gate up.
      isMedical = classifyQuery(query.toLowerCase()).category === 'medical';
    }
    setIsCheckingQuery(false);

    if (!isMedical) {
      setStep1Error(
        `❌ "${query}" is not a medical query. Hospitals are listed ONLY for illness, transplant, checkup, injury, or emergency.`
      );
      return;
    }
    setWizardStep(2);
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (!ageInput.trim()) return;
    setWizardStep(3);
    runRecommendationEngine(diseaseInput, ageInput, isBudgetOn, budgetValue);
  };

  const handleToggleBudget = (newToggleState) => {
    setIsBudgetOn(newToggleState);
    if (wizardStep === 3) {
      runRecommendationEngine(diseaseInput, ageInput, newToggleState, budgetValue);
    }
  };

  const handleBudgetChange = (val) => {
    setBudgetValue(val);
    if (wizardStep === 3 && isBudgetOn) {
      runRecommendationEngine(diseaseInput, ageInput, true, val);
    }
  };

  const NON_MEDICAL_MESSAGE =
    '🚫 Hospitals are shown ONLY for medical needs: illness, transplant, checkup, injury, or emergency.\n\n' +
    'This is a healthcare assistant — food, travel, tech, or anything non-medical will not return hospital results.\n\n' +
    'Try a condition like: kidney, heart, lungs, knee/joint pain, cancer, stomach, child care, hair transplant, skin.';

  const classifyRequestIdRef = useRef(0);

  const runRecommendationEngine = async (treatmentStr, ageStr, budgetToggle, maxBudgetStr) => {
    const text = treatmentStr.toLowerCase();
    const ageVal = parseInt(ageStr, 10);
    const hasAge = Number.isFinite(ageVal) && ageVal > 0;

    // Stale-response guard: only the latest run may update the results.
    const requestId = ++classifyRequestIdRef.current;
    const isStale = () => requestId !== classifyRequestIdRef.current;

    setSummaryText('⏳ Checking your condition...');
    setRecommendations([]);

    let ageCategory = "Adult Care Focus";
    if (hasAge && ageVal < 18) ageCategory = "Pediatric Care Focus (Under 18)";
    else if (hasAge && ageVal >= 60) ageCategory = "Senior Geriatric Care Focus (60+ Years)";

    // Gate 1 — medical classifier via the backend endpoint. Judges typed
    // "paneer tikka" and got hospitals; that must never happen again.
    // Falls back to the shared local classifier if the backend is down.
    let classification = null;
    try {
      const res = await classifyQueryAPI(treatmentStr);
      classification = { category: res.category, reason: res.reason, isMedical: res.isMedical };
    } catch {
      const local = classifyQuery(text);
      classification = { category: local.category, reason: local.reason, isMedical: local.category === 'medical' };
    }
    if (isStale()) return;

    if (!classification.isMedical) {
      setSummaryText(NON_MEDICAL_MESSAGE);
      setRecommendations([]);
      return;
    }

    // Gate 2 — specialty detection via the shared parser (single source of
    // truth with the backend NL endpoint and the search page).
    const detectedSpecialty = parseQueryToFilters(text).disease;

    // Medical query but no recognizable specialty -> still NO hospitals,
    // instead of dumping an unrelated list.
    if (!detectedSpecialty) {
      setSummaryText(
        `🤔 Could not identify a disease or specialty in "${treatmentStr}".\n` +
        `No hospital recommendations shown.\n\n` +
        `Try a condition like: kidney, heart, lungs, knee/joint pain, cancer, stomach, child care, hair transplant, skin.`
      );
      setRecommendations([]);
      return;
    }

    if (isStale()) return;

    let filtered = [...hospitals];

    if (detectedSpecialty) {
      filtered = filtered.filter(h => 
        h.specialties.some(s => s.toLowerCase().includes(detectedSpecialty))
      );
    }

    if (budgetToggle) {
      const budgetLimit = parseInt(maxBudgetStr) || 200000;
      filtered = filtered.filter(h => h.cost_estimate_min <= budgetLimit);
      filtered.sort((a, b) => a.cost_estimate_min - b.cost_estimate_min);

      setSummaryText(
        `🔍 Mode: Budget Filter Active (≤ ₹${budgetLimit.toLocaleString()})\n` +
        `Patient Age: ${hasAge ? `${ageVal} Yrs` : 'Not specified'} (${ageCategory})\n` +
        `Found ${filtered.length} hospitals matching ${detectedSpecialty ? detectedSpecialty.toUpperCase() : 'treatment'}:`
      );
    } else {
      // PREMIUM MODE: Budget filter OFF -> most-rated hospitals with the most
      // premium fee ranges first.
      filtered.sort(
        (a, b) =>
          (b.rating || 0) - (a.rating || 0) ||
          (b.cost_estimate_max || 0) - (a.cost_estimate_max || 0)
      );

      setSummaryText(
        `⭐ Mode: PREMIUM MODE (Budget Filter OFF)\n` +
        `Patient Age: ${hasAge ? `${ageVal} Yrs` : 'Not specified'} (${ageCategory})\n` +
        `Showing the highest-rated hospitals with the most premium fee ranges:`
      );
    }

    // Specialty-relevance ranking (same shared logic as backend + search page):
    // dedicated institutes ("Kidney Institute", cath-lab hospitals...) come
    // before generic multispecialty giants, so each disease gets its own top 4.
    setRecommendations(rankBySpecialtyRelevance(filtered, detectedSpecialty).slice(0, 4));
  };

  const resetWizard = () => {
    setWizardStep(1);
    setDiseaseInput('');
    setAgeInput('');
    setRecommendations([]);
  };

  const sampleDiseases = ['Kidney operation', 'Heart bypass surgery', 'Lungs treatment', 'Knee replacement', 'Cancer chemotherapy', 'Hair transplant'];

  return (
    <div className={isFloating ? "chatbot-window" : "chatbot-embedded-page"}>
      {/* Header */}
      <div className="chatbot-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h4 style={{ fontWeight: 600, fontSize: '0.9rem' }}>Omni Health AI Wizard</h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Step {wizardStep} of 3: {wizardStep === 1 ? 'Condition' : wizardStep === 2 ? 'Patient Age' : 'Budget & Results'}
            </span>
          </div>
        </div>
        {isFloating && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      {/* Helpline Consult Banner */}
      <div style={{ padding: '6px 14px', background: 'rgba(2, 132, 199, 0.08)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--text-subtle)' }}>Doctor Helpline:</span>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: '0.75rem', padding: '2px 8px', color: 'var(--text-accent)' }}
          onClick={onOpenHelpline}
        >
          📞 Call Helpline
        </button>
      </div>

      {/* Wizard Content Body */}
      <div className="chatbot-messages">
        {/* Step Indicator Bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: wizardStep >= 1 ? 'var(--primary-500)' : 'var(--border-subtle)' }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: wizardStep >= 2 ? 'var(--primary-500)' : 'var(--border-subtle)' }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: wizardStep >= 3 ? 'var(--primary-500)' : 'var(--border-subtle)' }} />
        </div>

        {/* STEP 1: Medical Treatment Search */}
        {wizardStep === 1 && (
          <div className="chat-bubble bot" style={{ width: '100%', maxWidth: '100%' }}>
            <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 }}>
              Step 1: What medical treatment or disease are you looking for?
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', marginBottom: 12 }}>
              Type any condition e.g. Kidney operation, Lungs treatment, Heart surgery, Knee replacement, Hair transplant.
            </p>
            <form onSubmit={handleStep1Submit} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Kidney operation, Heart surgery..."
                value={diseaseInput}
                onChange={(e) => setDiseaseInput(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={isCheckingQuery}>
                {isCheckingQuery ? 'Checking…' : 'Next →'}
              </button>
            </form>

            {step1Error && (
              <p style={{ fontSize: '0.8125rem', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, padding: '8px 10px', marginTop: 10, whiteSpace: 'pre-line' }} role="alert">
                {step1Error}
              </p>
            )}

            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sampleDiseases.map((sd, i) => (
                <button
                  key={i}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  onClick={() => { setDiseaseInput(sd); setWizardStep(2); }}
                >
                  {sd}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Patient Age Input */}
        {wizardStep === 2 && (
          <div className="chat-bubble bot" style={{ width: '100%', maxWidth: '100%' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-accent)', marginBottom: 4 }}>
              Selected Treatment: <strong>{diseaseInput}</strong>
            </p>
            <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 }}>
              Step 2: Enter the Patient's Age
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', marginBottom: 12 }}>
              Age helps us customize pediatric, adult, or senior care requirements.
            </p>
            <form onSubmit={handleStep2Submit} style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                className="form-input"
                placeholder="Enter Age e.g. 45"
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                min="1"
                max="115"
                required
              />
              <button type="submit" className="btn btn-primary btn-sm">Submit & Search →</button>
            </form>
          </div>
        )}

        {/* STEP 3: Budget Toggle & Results View */}
        {wizardStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Step 3 Budget Toggle Control Box */}
            <div style={{ background: 'var(--bg-input)', padding: 14, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Step 3: Budget Filter Option
                </span>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }} onClick={resetWizard}>
                  ↺ Reset Search
                </button>
              </div>

              {/* Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>
                  {isBudgetOn ? 'Budget Limit Active' : 'Budget OFF (Show Premium Hospitals)'}
                </span>
                <button
                  type="button"
                  className={`btn ${isBudgetOn ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                  onClick={() => handleToggleBudget(!isBudgetOn)}
                >
                  {isBudgetOn ? 'ON' : 'OFF (Premium Mode)'}
                </button>
              </div>

              {/* Budget Slider Input if Toggle is ON */}
              {isBudgetOn && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-subtle)', marginBottom: 4 }}>
                    <span>Max Budget Limit</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-accent)' }}>₹{parseInt(budgetValue).toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="600000"
                    step="25000"
                    value={budgetValue}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--primary-500)' }}
                  />
                </div>
              )}
            </div>

            {/* AI Summary Banner */}
            <div className="chat-bubble bot" style={{ width: '100%', maxWidth: '100%' }}>
              <p style={{ whiteSpace: 'pre-line', fontSize: '0.85rem' }}>{summaryText}</p>
            </div>

            {/* Hospital Recommendation Cards */}
            {recommendations.map((h, i) => (
              <div key={h.id} className="chat-card-recommendation">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-accent)' }}>
                    {isBudgetOn ? `#${i + 1} BEST VALUE MATCH` : `⭐ #${i + 1} TOP PREMIUM INSTITUTE`}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>★ {h.rating || 'N/A'}</span>
                    <span className="city-badge">{h.city}</span>
                  </div>
                </div>

                <h5 style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem', margin: '4px 0' }}>{h.name}</h5>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>State: {h.state}</p>

                <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', margin: '4px 0' }}>
                  Fees Estimate: <strong className="cost-range" style={{ fontSize: '0.875rem' }}>₹{h.cost_estimate_min.toLocaleString()} - ₹{h.cost_estimate_max.toLocaleString()}</strong>
                </p>

                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, fontSize: '0.75rem', padding: '4px' }}
                    onClick={() => onSelectForCompare && onSelectForCompare(h)}
                  >
                    Compare
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={onOpenHelpline}
                  >
                    Call Consult
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default AIChatbot;
