import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChange, resolveAppUser, signOutSupabase, toAppUser, fetchProfile } from "@/lib/supabaseAuth";
import { acceptPendingInvitations } from "@/lib/supabaseData";

const AuthContext = createContext(null);

/** Build app user from session — never call getUser() inside onAuthStateChange (deadlocks). */
async function userFromSession(session) {
  if (!session?.user) return null;
  try {
    const profile = await fetchProfile(session.user.id);
    return toAppUser(session.user, profile);
  } catch {
    return toAppUser(session.user, null);
  }
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((next) => {
    setUserState(next);
    if (next) setLoading(false);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const appUser = await resolveAppUser();
      if (appUser) {
        try {
          await acceptPendingInvitations(appUser);
        } catch {
          /* non-fatal */
        }
      }
      setUserState(appUser);
    } catch {
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const hydrate = async (session, acceptInvites) => {
      const appUser = await userFromSession(session);
      if (!active) return;
      if (appUser && acceptInvites) {
        try {
          await acceptPendingInvitations(appUser);
        } catch {
          /* non-fatal */
        }
      }
      if (!active) return;
      setUserState(appUser);
      setLoading(false);
    };

    const unsubscribe = onAuthStateChange((event, session) => {
      // Defer async Supabase calls until after the auth lock is released.
      setTimeout(() => {
        if (!active) return;
        if (event === "SIGNED_OUT") {
          setUserState(null);
          setLoading(false);
          return;
        }
        if (
          event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          hydrate(session, event === "SIGNED_IN" || event === "INITIAL_SESSION");
        }
      }, 0);
    });

    // Fallback if onAuthStateChange never fires (misconfigured client).
    const fallback = setTimeout(() => {
      if (active) checkAuth();
    }, 4000);

    return () => {
      active = false;
      clearTimeout(fallback);
      unsubscribe();
    };
  }, [checkAuth]);

  const logout = async () => {
    await signOutSupabase();
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }

// Format Pydantic/FastAPI errors safely (validation errors are arrays of objects)
export function formatApiError(err, fallback = "Something went wrong. Please try again.") {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
