import { useState } from 'react';
import { AuthService } from '../auth';
import { useModalBehavior } from '../lib/modalBehavior';

function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  useModalBehavior(isOpen, onClose);

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user;
      if (isLogin) {
        user = await AuthService.login(email, password);
      } else {
        user = await AuthService.signup(email, password, role);
      }
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoRole) => {
    // Route through AuthService so the session is stored under the SAME key
    // that getCurrentUser() reads (the old code wrote a key nothing read).
    const user = AuthService.demoLogin(demoRole);
    onAuthSuccess(user);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {isLogin ? 'Log In to Omni Health' : 'Create Account'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>
              Access patient services or administrator portal
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ padding: 10, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, color: '#fca5a5', fontSize: '0.8125rem', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, background: 'var(--bg-input)', padding: 4, borderRadius: 8, marginBottom: 16, border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className={`nav-tab ${role === 'patient' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem' }}
              onClick={() => setRole('patient')}
            >
              Patient
            </button>
            <button
              type="button"
              className={`nav-tab ${role === 'admin' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem' }}
              onClick={() => setRole('admin')}
            >
              Admin Portal
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label" htmlFor="auth-email">Email Address</label>
              <input
                type="email"
                id="auth-email"
                className="form-input"
                placeholder={role === 'admin' ? 'admin@omnihealth.com' : 'patient@gmail.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="auth-password">Password</label>
              <input
                type="password"
                id="auth-password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} disabled={loading}>
              {loading ? <span className="spinner" /> : (isLogin ? `Log In (${role.toUpperCase()})` : `Sign Up (${role.toUpperCase()})`)}
            </button>
          </form>

          <div style={{ margin: '16px 0', textAlign: 'center', position: 'relative' }}>
            <hr style={{ borderColor: 'var(--border-subtle)' }} />
            <span style={{ position: 'absolute', top: '-9px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface)', padding: '0 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Quick Demo Login
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => handleDemoLogin('patient')}
            >
              Demo Patient
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => handleDemoLogin('admin')}
            >
              Demo Admin
            </button>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--text-accent)', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
