import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Landing from './pages/Landing';
import HowItWorks from './pages/HowItWorks';
import Features from './pages/Features';
import Stories from './pages/Stories';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import Login from './pages/Login';
import GetStarted from './pages/GetStarted';
import Dashboard from './pages/Dashboard';
import RecipesPage from './pages/app/RecipesPage';
import StoriesPage from './pages/app/StoriesPage';
import VoiceRecipesPage from './pages/app/VoiceRecipesPage';
import AlbumsPage from './pages/app/AlbumsPage';
import FamilyTreePage from './pages/app/FamilyTreePage';
import SearchPage from './pages/app/SearchPage';
import SettingsPage from './pages/app/SettingsPage';
import NotificationsPage from './pages/app/NotificationsPage';
import PublicCookbook from './pages/PublicCookbook';
import AuthCallback from './pages/AuthCallback';
import { Toaster } from './components/ui/toaster';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function AppRoutes() {
  const location = useLocation();
  // Detect Emergent OAuth callback SYNCHRONOUSLY during render — before routes run
  if ((location.hash || '').includes('session_id=')) {
    return <AuthCallback />;
  }
  return (
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
    </Routes>
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
