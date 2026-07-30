import React, { useEffect, Suspense, lazy } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { Toaster } from './components/ui/toaster';

// Keep the landing page eager so the marketing hero paints instantly.
// Every other page is code-split — a first-time visitor to /pricing no longer
// downloads the entire authenticated dashboard bundle.
import Landing from './pages/Landing';
import AuthCallback from './pages/AuthCallback';

const HowItWorks     = lazy(() => import('./pages/HowItWorks'));
const Features       = lazy(() => import('./pages/Features'));
const Stories        = lazy(() => import('./pages/Stories'));
const Pricing        = lazy(() => import('./pages/Pricing'));
const About          = lazy(() => import('./pages/About'));
const Terms          = lazy(() => import('./pages/Terms'));
const Contact        = lazy(() => import('./pages/Contact'));
const Login          = lazy(() => import('./pages/Login'));
const GetStarted     = lazy(() => import('./pages/GetStarted'));
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const RecipesPage    = lazy(() => import('./pages/app/RecipesPage'));
const StoriesPage    = lazy(() => import('./pages/app/StoriesPage'));
const VoiceRecipesPage = lazy(() => import('./pages/app/VoiceRecipesPage'));
const AlbumsPage     = lazy(() => import('./pages/app/AlbumsPage'));
const FamilyTreePage = lazy(() => import('./pages/app/FamilyTreePage'));
const SearchPage     = lazy(() => import('./pages/app/SearchPage'));
const SettingsPage   = lazy(() => import('./pages/app/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/app/NotificationsPage'));
const PublicCookbook = lazy(() => import('./pages/PublicCookbook'));
const JoinFamily     = lazy(() => import('./pages/JoinFamily'));
const RecordRecipeRequest = lazy(() => import('./pages/RecordRecipeRequest'));

function RouteFallback() {
  // Warm cream backdrop matching the app so lazy chunks never flash white.
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-cumin-green border-t-transparent animate-spin" />
    </div>
  );
}

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function AppRoutes() {
  const location = useLocation();

  // Fire a Google Analytics page_view on every SPA route change. gtag's
  // auto-tracking only sees the initial page load; React Router transitions
  // are invisible to it, so we emit manually. Guarded so it's a no-op if
  // gtag failed to load (adblockers, offline, etc.).
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    const page_path = location.pathname + location.search;
    window.gtag('event', 'page_view', {
      page_path,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);

  // Detect Emergent OAuth callback SYNCHRONOUSLY during render — before routes run
  if ((location.hash || '').includes('session_id=')) {
    return <AuthCallback />;
  }
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/features" element={<Features />} />
        <Route path="/stories" element={<Stories />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/recipes" element={<RecipesPage />} />
        <Route path="/app/stories" element={<StoriesPage />} />
        <Route path="/app/voice-recipes" element={<VoiceRecipesPage />} />
        <Route path="/app/albums" element={<AlbumsPage />} />
        <Route path="/app/family-tree" element={<FamilyTreePage />} />
        <Route path="/app/search" element={<SearchPage />} />
        <Route path="/app/settings" element={<SettingsPage />} />
        <Route path="/app/notifications" element={<NotificationsPage />} />
        <Route path="/cookbook/:token" element={<PublicCookbook />} />
        <Route path="/join/:token" element={<JoinFamily />} />
        <Route path="/record/:token" element={<RecordRecipeRequest />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
