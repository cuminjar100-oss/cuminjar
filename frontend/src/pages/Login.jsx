import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/use-toast';

function formatDetail(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(' ');
  if (detail?.msg) return detail.msg;
  return fallback;
}

export default function Login() {
  const [show, setShow] = useState(false);
  const [stage, setStage] = useState('login'); // login | forgot | reset
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const inputsRef = useRef([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const submitLogin = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await api.authLogin({ email: email.trim().toLowerCase(), password });
      toast({ title: 'Welcome back!' });
      navigate('/app');
    } catch (err) {
      toast({ title: 'Login failed', description: formatDetail(err?.response?.data?.detail, 'Invalid email or password.') });
    } finally { setBusy(false); }
  };

  const sendReset = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.authForgotPassword({ email: resetEmail.trim().toLowerCase() });
      setStage('reset');
      setResendIn(45);
      toast({ title: 'Check your inbox', description: `We sent a 6-digit reset code to ${resetEmail}.` });
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) {
      toast({ title: 'Could not send reset code', description: formatDetail(err?.response?.data?.detail, 'Please try again.') });
    } finally { setBusy(false); }
  };

  const handleCodeChange = (idx, val) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...resetCode];
    next[idx] = digit;
    setResetCode(next);
    if (digit && idx < 5) inputsRef.current[idx + 1]?.focus();
  };
  const handleCodeKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !resetCode[idx] && idx > 0) inputsRef.current[idx - 1]?.focus();
  };
  const handleCodePaste = (e) => {
    const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.padEnd(6, '').split('').slice(0, 6);
    while (next.length < 6) next.push('');
    setResetCode(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const submitReset = async () => {
    const codeStr = resetCode.join('');
    if (codeStr.length !== 6) { toast({ title: 'Enter all 6 digits' }); return; }
    if (newPassword.length < 6) { toast({ title: 'Password must be at least 6 characters' }); return; }
    if (busy) return;
    setBusy(true);
    try {
      await api.authResetPassword({ email: resetEmail.trim().toLowerCase(), code: codeStr, password: newPassword });
      toast({ title: 'Password updated', description: 'You are now signed in.' });
      navigate('/app');
    } catch (err) {
      toast({ title: 'Reset failed', description: formatDetail(err?.response?.data?.detail, 'Please try again.') });
    } finally { setBusy(false); }
  };

  const resendReset = async () => {
    if (resendIn > 0 || busy) return;
    setBusy(true);
    try {
      await api.authForgotPassword({ email: resetEmail.trim().toLowerCase() });
      setResendIn(45);
      setResetCode(['', '', '', '', '', '']);
      toast({ title: 'New reset code sent' });
    } catch (err) {
      toast({ title: 'Could not resend', description: formatDetail(err?.response?.data?.detail, 'Please try again.') });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-cream grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-center px-16 py-10 bg-[#F3EBDC]">
        <Logo />
        <div className="mt-14 max-w-md">
          <h2 className="font-serif-display text-[36px] font-semibold text-neutral-900 leading-tight">Welcome back to your family jar.</h2>
          <p className="mt-4 text-neutral-700 text-[15px]">Every recipe. Every story. Every voice — kept safe in one warm place. Sign in to continue preserving your family’s heritage.</p>
          <ul className="mt-8 space-y-3 text-neutral-700">
            {['Private & secure family space', 'Voice recipes in 12 languages', 'Invite family in one click', 'Access from any device'].map(x => (
              <li key={x} className="flex items-center gap-2 text-[14.5px]"><CheckCircle2 size={17} className="text-cumin-green" /> {x}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col justify-center px-8 md:px-16 py-10">
        <div className="md:hidden"><Logo /></div>

        {stage === 'login' && (
          <div className="mt-6 max-w-md w-full">
            <h1 className="font-serif-display text-[38px] font-semibold text-neutral-900">Welcome back</h1>
            <p className="text-neutral-600 mt-2">Log in to your family jar.</p>

            <div className="mt-6">
              <GoogleSignInButton label="Continue with Google" />
            </div>

            <div className="flex items-center gap-3 my-6 text-[12px] text-neutral-400 uppercase tracking-wider">
              <span className="flex-1 h-px bg-neutral-200" /> or use email <span className="flex-1 h-px bg-neutral-200" />
            </div>

            <form onSubmit={submitLogin} className="space-y-4">
              <label className="block">
                <span className="text-[13px] font-semibold text-neutral-800">Email</span>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
                  <input data-testid="login-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-3 py-3 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" placeholder="you@family.com" />
                </div>
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold text-neutral-800">Password</span>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
                  <input data-testid="login-password" type={show ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-10 py-3 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" placeholder="Enter your password" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between text-[13px]">
                <label className="flex items-center gap-2 text-neutral-600"><input type="checkbox" className="accent-[#3D5A3A]" /> Remember me</label>
                <button
                  type="button"
                  onClick={() => { setResetEmail(email); setStage('forgot'); }}
                  className="text-cumin-green font-medium hover:underline"
                  data-testid="forgot-password-link"
                >Forgot password?</button>
              </div>

              <button type="submit" disabled={busy} data-testid="login-submit" className="w-full bg-cumin-green text-white py-3.5 rounded-lg font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                {busy && <Loader2 size={16} className="animate-spin" />} Log in
              </button>

              <p className="text-center text-[13.5px] text-neutral-600">
                New to CuminJar? <Link to="/get-started" className="text-cumin-green font-semibold hover:underline">Create an account</Link>
              </p>
            </form>
          </div>
        )}

        {stage === 'forgot' && (
          <div className="mt-6 max-w-md w-full">
            <button type="button" onClick={() => setStage('login')} className="text-[13px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1 mb-4"><ArrowLeft size={13} /> Back</button>
            <h1 className="font-serif-display text-[34px] font-semibold text-neutral-900">Reset your password</h1>
            <p className="text-neutral-600 mt-2 text-[14.5px]">Enter your account email and we&apos;ll send you a 6-digit code to reset your password.</p>

            <label className="block mt-6">
              <span className="text-[13px] font-semibold text-neutral-800">Email</span>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
                <input data-testid="forgot-email" type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-3 py-3 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" placeholder="you@family.com" />
              </div>
            </label>

            <button type="button" onClick={sendReset} disabled={busy || !resetEmail} data-testid="forgot-submit" className="mt-6 w-full bg-cumin-green text-white py-3.5 rounded-lg font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
              {busy && <Loader2 size={16} className="animate-spin" />} Send reset code
            </button>
          </div>
        )}

        {stage === 'reset' && (
          <div className="mt-6 max-w-md w-full">
            <button type="button" onClick={() => setStage('forgot')} className="text-[13px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1 mb-4"><ArrowLeft size={13} /> Back</button>
            <h1 className="font-serif-display text-[34px] font-semibold text-neutral-900">Enter your reset code</h1>
            <p className="text-neutral-600 mt-2 text-[14.5px]">We sent a 6-digit code to <b className="text-neutral-900">{resetEmail}</b>. Enter it below along with your new password.</p>

            <div className="mt-6 flex gap-2" onPaste={handleCodePaste}>
              {resetCode.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => (inputsRef.current[idx] = el)}
                  data-testid={`reset-digit-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeChange(idx, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(idx, e)}
                  className="w-12 h-14 text-center text-[22px] font-semibold border-2 border-neutral-200 rounded-lg focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10"
                />
              ))}
            </div>

            <label className="block mt-5">
              <span className="text-[13px] font-semibold text-neutral-800">New password</span>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
                <input data-testid="reset-new-password" type={show ? 'text' : 'password'} required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-10 py-3 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" placeholder="At least 6 characters" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <button type="button" onClick={submitReset} disabled={busy} data-testid="reset-submit" className="mt-6 w-full bg-cumin-green text-white py-3.5 rounded-lg font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
              {busy && <Loader2 size={16} className="animate-spin" />} Update password &amp; sign in
            </button>

            <p className="mt-4 text-center text-[13px] text-neutral-500">
              Didn’t get the code?{' '}
              {resendIn > 0 ? (
                <span className="text-neutral-400">Resend in {resendIn}s</span>
              ) : (
                <button type="button" onClick={resendReset} className="text-cumin-green font-semibold hover:underline" data-testid="reset-resend">Resend</button>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
