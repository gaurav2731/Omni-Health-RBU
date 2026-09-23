// Client-side demo authentication.
// KNOWN LIMITATION (documented in README): this is a mock auth layer for the
// MVP demo — credentials are not verified by a server, and roles are chosen
// at signup/demo-login. Do NOT use as-is in production.

const STORAGE_KEY = 'omni_health_user'; // single key; used by every auth path

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export const AuthService = {
  getCurrentUser: () => readStoredUser(),

  login: async (email, password) => {
    if (!email || !password) throw new Error('Email and password are required');
    return storeUser({
      uid: `user_${Date.now()}`,
      email,
      displayName: email.split('@')[0],
      role: 'user',
    });
  },

  signup: async (email, password, role = 'user') => {
    if (!email || !password) throw new Error('Email and password are required');
    return storeUser({
      uid: `user_${Date.now()}`,
      email,
      displayName: email.split('@')[0],
      role: role === 'admin' ? 'admin' : 'user',
    });
  },

  // One-click demo users for the hackathon demo. Uses the SAME storage key
  // as login/signup (the old code used a second key that was never read).
  demoLogin: (role = 'user') => {
    const email = role === 'admin' ? 'admin@omnihealth.com' : 'patient@omnihealth.com';
    return storeUser({
      uid: `demo_${role}`,
      email,
      displayName: role === 'admin' ? 'Demo Admin' : 'Demo Patient',
      role: role === 'admin' ? 'admin' : 'user',
    });
  },

  logout: async () => {
    localStorage.removeItem(STORAGE_KEY);
  },
};
