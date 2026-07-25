import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, BookHeart, Users2, AlertTriangle } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/use-toast';

// /join/:token — the destination of every family-invite QR code.
// Flow: show family preview → if user is signed in, "Join" adds them and
// routes to the family dashboard; if not signed in, redirect to /get-started
// with the token stashed so we can resume the join after signup/login.
export default function JoinFamily() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [preview, setPreview] = useState(null);
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | joining | joined | error
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [previewResp, meResp] = await Promise.all([
          api.familyJoinPreview(token),
          api.authMe().catch(() => null),
        ]);
        setPreview(previewResp);
        setMe(meResp);
        setStatus('ready');
      } catch (err) {
        setError(err?.response?.data?.detail || 'This invite link is no longer active.');
        setStatus('error');
      }
    })();
  }, [token]);

  const handleJoin = async () => {
    if (!me?.id) {
      // Preserve the token so signup/login can resume the join afterward
      try { window.sessionStorage.setItem('pending_join_token', token); } catch { /* noop */ }
      navigate(`/get-started?join=${token}`);
      return;
    }
    setStatus('joining');
    try {
      const result = await api.familyJoin(token);
      setStatus('joined');
      toast({ title: `Welcome to ${result.family_name}!`, description: 'You have joined this family jar.' });
      setTimeout(() => navigate('/app'), 1400);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not join. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center" data-testid="join-family-loading">
        <Loader2 className="animate-spin text-cumin-green" size={26} />
      </div>
    );
  }

  if (status === 'error' && !preview) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6" data-testid="join-family-error">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-[#FDECEA] text-red-700 flex items-center justify-center mx-auto">
            <AlertTriangle size={22} />
          </div>
          <h1 className="mt-4 font-serif-display text-[26px] font-semibold text-neutral-900">Invite no longer active</h1>
          <p className="mt-2 text-[14px] text-neutral-600">{error}</p>
          <Link to="/" className="inline-block mt-6 bg-cumin-green text-white px-5 py-2.5 rounded-lg text-[14px] font-medium">Back to CuminJar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-neutral-200/70 overflow-hidden" data-testid="join-family-card">
        <div className="bg-[#F7EFE1] px-6 py-8 text-center">
          {preview?.coverPhoto ? (
            <img src={preview.coverPhoto} alt="" className="w-20 h-20 rounded-2xl mx-auto object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white mx-auto flex items-center justify-center">
              <BookHeart className="text-terracotta" size={32} />
            </div>
          )}
          <p className="mt-4 text-[11px] tracking-[0.14em] text-terracotta font-semibold uppercase">You&rsquo;re invited</p>
          <h1 className="mt-1 font-serif-display text-[30px] font-semibold text-neutral-900" data-testid="join-family-name">
            {preview?.name}
          </h1>
          {preview?.description && (
            <p className="mt-1.5 text-[13.5px] text-neutral-600 leading-relaxed">{preview.description}</p>
          )}
          <div className="mt-4 flex items-center justify-center gap-4 text-[12.5px] text-neutral-600">
            <span className="inline-flex items-center gap-1"><Users2 size={13} /> {preview?.recipes_count || 0} recipes</span>
            <span className="text-neutral-300">·</span>
            <span>{preview?.stories_count || 0} stories</span>
          </div>
        </div>

        <div className="px-6 py-6">
          {status === 'joined' ? (
            <div className="text-center py-3" data-testid="join-success">
              <div className="w-12 h-12 rounded-full bg-[#DFEAD8] text-cumin-green flex items-center justify-center mx-auto">
                <CheckCircle2 size={20} />
              </div>
              <p className="mt-3 font-medium text-neutral-900">You&rsquo;re in!</p>
              <p className="text-[13px] text-neutral-500 mt-1">Taking you to the family jar…</p>
            </div>
          ) : (
            <>
              <p className="text-[14px] text-neutral-700 text-center leading-relaxed">
                {me?.id ? (
                  <>Signed in as <b className="text-neutral-900">{me.name || me.email}</b>. Join to start adding recipes &amp; stories.</>
                ) : (
                  <>Create your CuminJar account (or sign in) to join this family jar.</>
                )}
              </p>
              <button
                onClick={handleJoin}
                disabled={status === 'joining'}
                data-testid="join-family-cta"
                className="mt-5 w-full bg-cumin-green text-white py-3 rounded-lg font-medium hover:bg-[#324A2F] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {status === 'joining' ? <><Loader2 size={16} className="animate-spin" /> Joining…</> : (me?.id ? `Join ${preview?.name || 'this family'}` : 'Sign up to join')}
              </button>
              {error && <p className="mt-3 text-[12.5px] text-red-700 text-center">{error}</p>}
              <p className="mt-4 text-center text-[11.5px] text-neutral-500">
                By joining, {me?.id ? 'you agree to' : 'you\u2019ll agree to'} our <Link to="/terms" className="underline">Terms</Link> &amp; <Link to="/privacy" className="underline">Privacy</Link>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
