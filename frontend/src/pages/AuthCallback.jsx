import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../api';
import { setCachedAuthUser } from '../utils/authCache';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash || window.location.hash || '';
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const sessionId = params.get('session_id');
    if (!sessionId) {
      navigate('/login', { replace: true });
      return;
    }

    (async () => {
      try {
        const { user } = await api.authSession(sessionId);
        setCachedAuthUser(user);
        try {
          localStorage.setItem('cuminjar_user', JSON.stringify(user));
        } catch { /* ignore */ }
        navigate('/app', { replace: true, state: { user } });
      } catch (e) {
        navigate('/login', { replace: true, state: { error: 'Sign-in failed. Please try again.' } });
      }
    })();
  }, [navigate, location.hash]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center">
        <Loader2 className="animate-spin text-cumin-green mx-auto" size={26} />
        <p className="mt-3 text-[13px] text-neutral-600">Finishing sign-in…</p>
      </div>
    </div>
  );
}
