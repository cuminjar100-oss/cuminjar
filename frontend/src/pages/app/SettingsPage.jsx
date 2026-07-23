import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import { getCachedAuthUser, setCachedAuthUser, clearCachedAuthUser } from '../../utils/authCache';
import { currentUser } from '../../mock';
import api from '../../api';
import { useToast } from '../../hooks/use-toast';
import {
  User as UserIcon, Users, Languages, Bell, Shield, CreditCard, LogOut, Pencil, Check, X, Loader2,
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'Hindi (हिन्दी)' },
  { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
  { code: 'te-IN', label: 'Telugu (తెలుగు)' },
  { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml-IN', label: 'Malayalam (മലയാളം)' },
  { code: 'mr-IN', label: 'Marathi (मराठी)' },
  { code: 'bn-IN', label: 'Bengali (বাংলা)' },
  { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
  { code: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)' },
];

function pickAvatar(user) {
  if (user?.picture) return user.picture;
  return currentUser.avatar; // demo avatar as visual fallback only
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cached = getCachedAuthUser();
  const [me, setMe] = useState(cached);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(!cached);

  // Edit-name modal state
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // Notification prefs (local + backend)
  const [prefs, setPrefs] = useState({ email: true, inapp: true, weekly_digest: false });
  const [signingOutAll, setSigningOutAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const u = await api.authMe();
      setMe(u);
      setCachedAuthUser(u);
      if (u?.notification_prefs) setPrefs(p => ({ ...p, ...u.notification_prefs }));
    } catch {
      setMe(null);
      clearCachedAuthUser();
    }
    try { setFamilies(await api.listFamilies()); } catch { setFamilies([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const isSignedIn = !!me;
  const displayName = me?.name || 'Guest';
  const displayEmail = me?.email || 'You are browsing as a guest';
  const activeLang = me?.language || localStorage.getItem('cuminjar_language') || 'en-IN';

  const saveName = async () => {
    if (!nameDraft.trim()) { toast({ title: 'Name cannot be empty' }); return; }
    setSaving(true);
    try {
      const u = await api.authUpdateMe({ name: nameDraft.trim() });
      setMe(u); setCachedAuthUser(u); setEditingName(false);
      toast({ title: 'Name updated' });
    } catch (err) {
      toast({ title: 'Could not update name', description: err?.response?.data?.detail || err?.message });
    } finally { setSaving(false); }
  };

  const savePref = async (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (!isSignedIn) {
      try { localStorage.setItem('cuminjar_notif_prefs', JSON.stringify(next)); } catch { /* ignore */ }
      return;
    }
    try {
      const u = await api.authUpdateMe({ notification_prefs: next });
      setMe(u); setCachedAuthUser(u);
    } catch (err) {
      toast({ title: 'Could not save preference', description: err?.response?.data?.detail || err?.message });
    }
  };

  const saveLanguage = async (code) => {
    try { localStorage.setItem('cuminjar_language', code); } catch { /* ignore */ }
    if (!isSignedIn) return;
    try {
      const u = await api.authUpdateMe({ language: code });
      setMe(u); setCachedAuthUser(u);
      toast({ title: 'Language updated' });
    } catch (err) {
      toast({ title: 'Could not update language', description: err?.response?.data?.detail || err?.message });
    }
  };

  const doLogout = async () => {
    try { await api.authLogout(); } catch { /* ignore */ }
    clearCachedAuthUser();
    try {
      localStorage.removeItem('cuminjar_verified_email');
      localStorage.removeItem('cuminjar_active_family');
    } catch { /* ignore */ }
    navigate('/login');
  };

  const doLogoutAll = async () => {
    if (!window.confirm('Sign out on every device? You will need to sign back in on each.')) return;
    setSigningOutAll(true);
    try {
      await api.authLogoutAll();
      clearCachedAuthUser();
      navigate('/login');
    } catch (err) {
      toast({ title: 'Could not sign out everywhere', description: err?.response?.data?.detail || err?.message });
    } finally { setSigningOutAll(false); }
  };

  return (
    <AppShell active="">
      <div className="px-4 lg:px-8 py-4 lg:py-6 max-w-3xl">
        <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Settings</h1>
        <p className="text-neutral-500 text-[14px] mt-1">Manage your account and family preferences.</p>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-neutral-400" size={22} /></div>
        ) : (
        <div className="mt-8 space-y-4">

          {/* Profile */}
          <section className="bg-white rounded-2xl border border-neutral-200/70 p-6" data-testid="settings-profile">
            <div className="flex items-center gap-2">
              <UserIcon size={16} className="text-neutral-500" />
              <h2 className="font-semibold text-neutral-900">Profile</h2>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <img
                src={pickAvatar(me)}
                alt={displayName}
                onError={(e) => { e.currentTarget.src = currentUser.avatar; }}
                className="w-14 h-14 rounded-full object-cover border border-neutral-200"
              />
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                      data-testid="settings-name-input"
                      className="flex-1 border border-neutral-200 rounded-md px-2.5 py-1.5 text-[14px] focus:outline-none focus:border-cumin-green"
                      placeholder="Your name"
                    />
                    <button onClick={saveName} disabled={saving} data-testid="settings-name-save" className="w-8 h-8 rounded-md bg-cumin-green text-white flex items-center justify-center hover:bg-[#324A2F] disabled:opacity-70">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button onClick={() => setEditingName(false)} className="w-8 h-8 rounded-md hover:bg-neutral-100 flex items-center justify-center"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-[15px] text-neutral-900 truncate" data-testid="settings-display-name">{displayName}</p>
                    <p className="text-[13px] text-neutral-500 truncate" data-testid="settings-display-email">{displayEmail}</p>
                  </>
                )}
              </div>
              {!editingName && isSignedIn && (
                <button
                  onClick={() => { setNameDraft(me.name || ''); setEditingName(true); }}
                  data-testid="settings-edit-name"
                  className="text-[13px] font-medium text-cumin-green hover:underline flex items-center gap-1"
                >
                  <Pencil size={12} /> Edit
                </button>
              )}
            </div>
            {!isSignedIn && (
              <button onClick={() => navigate('/login')} className="mt-4 text-[13px] font-medium text-cumin-green hover:underline">Sign in to edit your profile →</button>
            )}
          </section>

          {/* Family Groups */}
          <section className="bg-white rounded-2xl border border-neutral-200/70 p-6" data-testid="settings-families">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-neutral-500" />
                <h2 className="font-semibold text-neutral-900">Family Groups</h2>
              </div>
              <button onClick={() => navigate('/app')} className="text-[13px] font-medium text-cumin-green hover:underline">Manage</button>
            </div>
            {families.length === 0 ? (
              <p className="text-[13px] text-neutral-500 mt-3">No family groups yet. Create one from the Home tab.</p>
            ) : (
              <ul className="mt-4 divide-y divide-neutral-100">
                {families.map(f => (
                  <li key={f.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[14px] text-neutral-900">{f.name}</p>
                      <p className="text-[12px] text-neutral-500">{(f.members?.length || 0) + 1} {(f.members?.length || 0) + 1 === 1 ? 'member' : 'members'}</p>
                    </div>
                    <span className="text-[11px] uppercase tracking-wider text-neutral-400">{f.language || 'English'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Language */}
          <section className="bg-white rounded-2xl border border-neutral-200/70 p-6" data-testid="settings-language">
            <div className="flex items-center gap-2">
              <Languages size={16} className="text-neutral-500" />
              <h2 className="font-semibold text-neutral-900">Language</h2>
            </div>
            <p className="text-[12.5px] text-neutral-500 mt-1">The language we use to translate and structure your recordings.</p>
            <select
              value={activeLang}
              onChange={(e) => saveLanguage(e.target.value)}
              data-testid="settings-language-select"
              className="mt-3 w-full sm:w-72 border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] bg-white focus:outline-none focus:border-cumin-green"
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </section>

          {/* Notifications */}
          <section className="bg-white rounded-2xl border border-neutral-200/70 p-6" data-testid="settings-notifications">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-neutral-500" />
              <h2 className="font-semibold text-neutral-900">Notifications</h2>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { key: 'email', label: 'Email notifications', desc: 'Family invites, weekly digest, cookbook updates' },
                { key: 'inapp', label: 'In-app notifications', desc: 'Live updates when family members add memories' },
                { key: 'weekly_digest', label: 'Weekly digest', desc: 'A gentle Sunday recap of your family jar' },
              ].map(item => (
                <label key={item.key} className="flex items-start justify-between gap-4 cursor-pointer">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-neutral-900">{item.label}</p>
                    <p className="text-[12px] text-neutral-500">{item.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => savePref(item.key, !prefs[item.key])}
                    aria-pressed={prefs[item.key]}
                    data-testid={`settings-notif-${item.key}`}
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 rounded-full transition-colors ${prefs[item.key] ? 'bg-cumin-green' : 'bg-neutral-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs[item.key] ? 'translate-x-5' : ''}`} />
                  </button>
                </label>
              ))}
            </div>
          </section>

          {/* Privacy & Security */}
          <section className="bg-white rounded-2xl border border-neutral-200/70 p-6" data-testid="settings-privacy">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-neutral-500" />
              <h2 className="font-semibold text-neutral-900">Privacy &amp; Security</h2>
            </div>
            <p className="text-[13px] text-neutral-600 mt-2 leading-relaxed">
              Your recordings, transcripts and photos are stored privately. Only members you invite to a family group can see that family&apos;s contents.
              Anything you don&apos;t share publicly stays inside your jar.
            </p>
            {isSignedIn && (
              <button
                onClick={doLogoutAll}
                disabled={signingOutAll}
                data-testid="settings-logout-all"
                className="mt-4 text-[13px] font-medium text-terracotta hover:underline disabled:opacity-70 flex items-center gap-1"
              >
                {signingOutAll ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />} Sign out on all devices
              </button>
            )}
          </section>

          {/* Subscription */}
          <section className="bg-white rounded-2xl border border-neutral-200/70 p-6" data-testid="settings-subscription">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-neutral-500" />
                <h2 className="font-semibold text-neutral-900">Subscription</h2>
              </div>
              <button onClick={() => navigate('/pricing')} className="text-[13px] font-medium text-cumin-green hover:underline">View plans</button>
            </div>
            <p className="text-[13px] text-neutral-600 mt-2">You&apos;re on the <b>Family Free</b> plan — unlimited recipes, stories and family groups while we&apos;re in beta.</p>
          </section>

          {isSignedIn && (
            <button
              onClick={doLogout}
              data-testid="settings-logout"
              className="w-full sm:w-auto text-[13.5px] text-terracotta font-medium hover:underline flex items-center gap-1.5 pt-2"
            >
              <LogOut size={13} /> Log out
            </button>
          )}
        </div>
        )}
      </div>
    </AppShell>
  );
}
