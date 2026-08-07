// Tiny synchronous cache for the signed-in user so the header/greeting never
// flash the demo fallback ("Sameera") between /app/* route changes. On successful
// api.authMe() we write to localStorage; on mount, components hydrate from it
// synchronously before triggering a background refresh.

const KEY = 'cuminjar_user';
const RECENT_KEY = 'cuminjar_recent_accounts';
const RECENT_MAX = 3;

export function getCachedAuthUser() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u && (u.name || u.email)) return u;
    return null;
  } catch { return null; }
}

export function setCachedAuthUser(user) {
  try {
    if (user && (user.name || user.email)) {
      localStorage.setItem(KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEY);
    }
  } catch { /* ignore quota errors */ }
}

export function clearCachedAuthUser() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// ---------------- Recent accounts (multi-user shared devices) ----------------

// Returns an array of the last few accounts that logged in on this browser:
//   [{ email, firstName, picture, lastUsedAt }]
// Most-recently used first. Capped at RECENT_MAX (3). Never contains passwords.
export function getRecentAccounts() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter(a => a && typeof a === 'object' && a.email)
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

// Adds/updates a user in the recent list, bumping them to the front.
// Accepts either an authenticated user object OR a partial {email, name, picture}.
export function rememberRecentAccount(user) {
  try {
    if (!user || !user.email) return;
    const firstName = (user.name || '').trim().split(' ')[0] || '';
    const entry = {
      email: user.email,
      firstName,
      picture: user.picture || null,
      lastUsedAt: new Date().toISOString(),
    };
    const list = getRecentAccounts().filter(a => a.email !== entry.email);
    list.unshift(entry);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch { /* ignore */ }
}

export function forgetRecentAccount(email) {
  try {
    const list = getRecentAccounts().filter(a => a.email !== email);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

export function clearAllRecentAccounts() {
  try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
}
