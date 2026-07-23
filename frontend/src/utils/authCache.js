// Tiny synchronous cache for the signed-in user so the header/greeting never
// flash the demo fallback ("Meera") between /app/* route changes. On successful
// api.authMe() we write to localStorage; on mount, components hydrate from it
// synchronously before triggering a background refresh.

const KEY = 'cuminjar_user';

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
