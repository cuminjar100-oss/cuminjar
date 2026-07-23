import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/use-toast';

export default function GetStarted() {
  const [show, setShow] = useState(false);
  const [stage, setStage] = useState('form'); // form | verify
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendIn, setResendIn] = useState(0);
  const inputsRef = useRef([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendOtp = async () => {
    setBusy(true);
    try {
      await api.requestOtp({ email: form.email.trim().toLowerCase(), name: form.name.trim() });
      setStage('verify');
      setResendIn(45);
      toast({ title: 'Check your inbox', description: `We sent a 6-digit code to ${form.email}` });
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (e) {
      toast({ title: 'Could not send code', description: e?.response?.data?.detail || e?.message || 'Please try again.' });
    } finally { setBusy(false); }
  };

  const submitForm = (e) => { e.preventDefault(); sendOtp(); };

  const handleCodeChange = (idx, val) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) inputsRef.current[idx + 1]?.focus();
  };
  const handleCodeKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) inputsRef.current[idx - 1]?.focus();
  };
  const handleCodePaste = (e) => {
    const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.padEnd(6, '').split('').slice(0, 6);
    while (next.length < 6) next.push('');
    setCode(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const verify = async () => {
    const codeStr = code.join('');
    if (codeStr.length !== 6) {
      toast({ title: 'Enter all 6 digits' });
      return;
    }
    setBusy(true);
    try {
      await api.verifyOtp({ email: form.email.trim().toLowerCase(), code: codeStr });
      // Now create the account with the password the user chose
      await api.authRegister({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        name: form.name.trim(),
      });
      toast({ title: 'Welcome to CuminJar!', description: 'Your account is ready.' });
      try { localStorage.setItem('cuminjar_verified_email', form.email.toLowerCase()); } catch { /* ignore */ }
      navigate('/app');
    } catch (e) {
      const msg = e?.response?.data?.detail;
      toast({ title: 'Sign-up failed', description: (typeof msg === 'string' ? msg : null) || e?.message || 'Please try again.' });
      setCode(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally { setBusy(false); }
  };

  const resend = async () => {
    if (resendIn > 0 || busy) return;
    setBusy(true);
    try {
      await api.requestOtp({ email: form.email.trim().toLowerCase(), name: form.name.trim() });
      setResendIn(45);
      setCode(['', '', '', '', '', '']);
      toast({ title: 'New code sent', description: 'Check your inbox.' });
    } catch (e) {
      toast({ title: 'Could not resend', description: e?.response?.data?.detail || e?.message });
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-cream grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-center px-16 py-10 bg-[#F3EBDC]">
        <Logo />
        <div className="mt-14 max-w-md">
          <h2 className="font-serif-display text-[36px] font-semibold text-neutral-900 leading-tight">Preserve your family’s flavors, forever.</h2>
          <p className="mt-4 text-neutral-700 text-[15px]">Join 1,000+ families using CuminJar to record voice recipes, save handwritten notes, and pass down traditions.</p>
          <ul className="mt-8 space-y-3 text-neutral-700">
            {['Free to start — no credit card', 'Private & secure family space', 'Works in 12 languages', 'Cancel anytime'].map(x => (
              <li key={x} className="flex items-center gap-2 text-[14.5px]"><CheckCircle2 size={17} className="text-cumin-green" /> {x}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col justify-center px-8 md:px-16 py-10">
        <div className="md:hidden"><Logo /></div>

        {stage === 'form' && (
          <div className="mt-6 max-w-md w-full">
            <h1 className="font-serif-display text-[38px] font-semibold text-neutral-900">Create your account</h1>
            <p className="text-neutral-600 mt-2">Start free. Set up your family jar in minutes.</p>

            <div className="mt-6">
              <GoogleSignInButton label="Continue with Google" />
            </div>

            <div className="flex items-center gap-3 my-6 text-[12px] text-neutral-400 uppercase tracking-wider">
              <span className="flex-1 h-px bg-neutral-200" />
              or sign up with email
              <span className="flex-1 h-px bg-neutral-200" />
            </div>

            <form onSubmit={submitForm} className="space-y-4">
              <label className="block">
                <span className="text-[13px] font-semibold text-neutral-800">Your Name</span>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
                  <input data-testid="signup-name" type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-3 py-3 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" placeholder="Meera Rao" />
                </div>
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold text-neutral-800">Email</span>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
                  <input data-testid="signup-email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-3 py-3 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" placeholder="you@family.com" />
                </div>
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold text-neutral-800">Password</span>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
                  <input data-testid="signup-password" type={show ? 'text' : 'password'} required minLength={6} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-10 py-3 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" placeholder="Create a password" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <button type="submit" disabled={busy} data-testid="signup-submit" className="w-full bg-cumin-green text-white py-3.5 rounded-lg font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                {busy && <Loader2 size={16} className="animate-spin" />} Send verification code
              </button>

              <p className="text-[12px] text-neutral-500 text-center">By continuing, you agree to CuminJar’s Terms and Privacy Policy.</p>
              <p className="text-center text-[13.5px] text-neutral-600">
                Already have an account? <Link to="/login" className="text-cumin-green font-semibold hover:underline">Log in</Link>
              </p>
            </form>
          </div>
        )}

        {stage === 'verify' && (
          <div className="mt-6 max-w-md w-full">
            <button type="button" onClick={() => setStage('form')} className="text-[13px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1 mb-4"><ArrowLeft size={13} /> Back</button>
            <h1 className="font-serif-display text-[34px] font-semibold text-neutral-900 leading-tight">Verify your email</h1>
            <p className="text-neutral-600 mt-2 text-[14.5px]">
              We emailed a 6-digit code to <b className="text-neutral-900">{form.email}</b>. Enter it below to finish creating your account.
            </p>

            <div className="mt-8 flex gap-2" onPaste={handleCodePaste}>
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => (inputsRef.current[idx] = el)}
                  data-testid={`otp-digit-${idx}`}
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

            <button type="button" onClick={verify} disabled={busy} data-testid="otp-verify" className="mt-6 w-full bg-cumin-green text-white py-3.5 rounded-lg font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
              {busy && <Loader2 size={16} className="animate-spin" />} Verify &amp; continue
            </button>

            <p className="mt-4 text-center text-[13px] text-neutral-500">
              Didn’t get the code?{' '}
              {resendIn > 0 ? (
                <span className="text-neutral-400">Resend in {resendIn}s</span>
              ) : (
                <button type="button" onClick={resend} className="text-cumin-green font-semibold hover:underline" data-testid="otp-resend">Resend</button>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
