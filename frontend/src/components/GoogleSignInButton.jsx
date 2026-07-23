import React from 'react';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function GoogleSignInButton({ label = 'Continue with Google', className = '' }) {
  const startGoogleAuth = () => {
    const redirectUrl = `${window.location.origin}/app`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <button
      type="button"
      onClick={startGoogleAuth}
      data-testid="google-signin"
      className={`w-full flex items-center justify-center gap-3 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-lg py-3 text-[14px] font-medium text-neutral-800 transition-colors ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.49 12.27c0-.86-.08-1.68-.22-2.47H12v4.68h6.44c-.28 1.5-1.13 2.77-2.4 3.62v3.02h3.87c2.27-2.09 3.58-5.17 3.58-8.85z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11C3.23 21.29 7.31 24 12 24z"/>
        <path fill="#FBBC05" d="M5.27 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.61H1.26C.46 8.24 0 10.06 0 12s.46 3.76 1.26 5.39l4.01-3.11z"/>
        <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.96 1.19 15.24 0 12 0 7.31 0 3.23 2.71 1.26 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z"/>
      </svg>
      {label}
    </button>
  );
}
