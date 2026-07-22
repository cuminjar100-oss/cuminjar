import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth, formatApiError } from "@/context/AuthContext";
import { isConsoleOtpEnabled } from "@/lib/devOtp";
import { getSupabase } from "@/lib/supabase";
import {
  signInWithEmail,
  sendEmailOtp,
  verifyEmailOtp,
  requestPasswordReset,
  updatePassword,
} from "@/lib/supabaseAuth";
import { emailValidationError, normalizeEmail } from "@/lib/email";
import AuthField, { authInputCls } from "@/components/AuthField";
import PasswordInput from "@/components/PasswordInput";

const HERO_IMG = "/login-hero.jpg";

export default function Login() {
  const [searchParams] = useSearchParams();
  /** password = email + password | emailOtp = email one-time code */
  const [method, setMethod] = useState("password");
  const [step, setStep] = useState("identifier");
  const [email, setEmail] = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [emailStep, setEmailStep] = useState("sign-in"); // sign-in | forgot | reset-password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [devResetLink, setDevResetLink] = useState(null);
  const [copiedResetLink, setCopiedResetLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const e = searchParams.get("email");
    if (e) {
      setEmail(e);
      setMethod("password");
    }
  }, [searchParams]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return undefined;

    const openResetForm = () => {
      setMethod("password");
      setStep("identifier");
      setEmailStep("reset-password");
      setError(null);
    };

    const hash = window.location.hash || "";
    if (hash.includes("type=recovery")) {
      openResetForm();
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (hash.includes("type=recovery") && session) {
        openResetForm();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        openResetForm();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const switchMethod = (next) => {
    setMethod(next);
    setStep("identifier");
    setError(null);
    setOtp("");
    setConfirmedEmail("");
    setPassword("");
    setEmailStep("sign-in");
    setResetSent(false);
    setDevResetLink(null);
    setNewPassword("");
    setConfirmPassword("");
  };

  const goBackToIdentifier = () => {
    setStep("identifier");
    setOtp("");
    setError(null);
    setConfirmedEmail("");
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResetSent(false);
    setDevResetLink(null);
    try {
      const emailErr = emailValidationError(email);
      if (emailErr) {
        setError(emailErr);
        return;
      }
      const result = await requestPasswordReset(email);
      setResetSent(true);
      if (result?.action_link) setDevResetLink(result.action_link);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "We couldn't send a reset link. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (newPassword.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords don't match.");
        return;
      }
      const user = await updatePassword(newPassword);
      setUser(user);
      window.history.replaceState(null, "", "/login");
      const dest = location.state?.from?.pathname || "/";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.message || "We couldn't update your password. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const emailErr = emailValidationError(email);
      if (emailErr) {
        setError(emailErr);
        return;
      }
      const user = await signInWithEmail({ email, password });
      setUser(user);
      const dest = location.state?.from?.pathname || "/";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.message || "Invalid email or password.");
    } finally {
      setBusy(false);
    }
  };

  const handleEmailOtpSend = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const emailErr = emailValidationError(email);
      if (emailErr) {
        setError(emailErr);
        return;
      }
      const { email: sentTo } = await sendEmailOtp(email);
      setConfirmedEmail(sentTo);
      setStep("otp");
    } catch (err) {
      setError(err?.message || formatApiError(err, "We couldn't send a verification code."));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailOtpVerify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await verifyEmailOtp({
        email: confirmedEmail || normalizeEmail(email),
        otp,
      });
      setUser(user);
      const dest = location.state?.from?.pathname || "/";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.message || formatApiError(err, "We couldn't sign you in."));
    } finally {
      setBusy(false);
    }
  };

  const displayEmail = confirmedEmail || normalizeEmail(email) || "your email";

  const subtitle =
    method === "password" && emailStep === "forgot"
      ? "We'll email you a link to choose a new password."
      : method === "password" && emailStep === "reset-password"
        ? "Choose a new password for your account."
        : method === "password"
          ? "Sign in with your email and password."
          : step === "identifier"
            ? "We'll send a one-time code to your email."
            : `Enter the code we sent to ${displayEmail}.`;

  return (
    <div data-testid="login-screen" className="min-h-screen w-full grid lg:grid-cols-5 bg-[#FDFBF7]">
      <div className="relative lg:col-span-3 overflow-hidden min-h-[280px] lg:min-h-screen">
        <img src={HERO_IMG} alt="Indian grandmother cooking in a warm kitchen" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2C302B]/70 via-[#D96C4A]/40 to-[#D9A05B]/30 mix-blend-multiply" />
        <div className="grain" />
        <div className="relative z-10 h-full flex flex-col justify-end p-8 sm:p-12 lg:p-16 text-white">
          <div className="max-w-xl animate-fadeUp">
            <p className="uppercase tracking-[0.3em] text-xs sm:text-sm text-[#F6E6D3] mb-4">A vault of family entries</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] drop-shadow-sm">
              The easiest way to <em className="not-italic text-[#FFE3B0]">share recipes.</em>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-white/90 max-w-md">
              Just talk through your entry — in any language. We'll save your voice
              and turn it into beautiful step-by-step cards for the family.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md animate-fadeUp">
          <div className="mb-8">
            <div className="w-14 h-14 rounded-3xl bg-[#D96C4A] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(217,108,74,0.25)] mb-5">
              <span className="font-display text-2xl">ms</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl text-[#2C302B] leading-tight">Welcome back</h2>
            <p className="text-[#5B6359] mt-2">{subtitle}</p>
            {step === "identifier" && emailStep === "sign-in" && (
              <p className="text-[#8C857B] text-sm mt-1">
                Use your password, or get a one-time code by email.
              </p>
            )}
          </div>

          {step === "identifier" && emailStep === "sign-in" && (
            <div
              className="flex rounded-full bg-[#F6F3EB] border border-[#8C857B]/20 p-1 mb-6"
              role="tablist"
              data-testid="login-method-tabs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={method === "password"}
                data-testid="login-method-password"
                onClick={() => switchMethod("password")}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                  method === "password"
                    ? "bg-white text-[#2C302B] shadow-sm"
                    : "text-[#5B6359] hover:text-[#2C302B]"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={method === "emailOtp"}
                data-testid="login-method-email-otp"
                onClick={() => switchMethod("emailOtp")}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                  method === "emailOtp"
                    ? "bg-white text-[#2C302B] shadow-sm"
                    : "text-[#5B6359] hover:text-[#2C302B]"
                }`}
              >
                Email code
              </button>
            </div>
          )}

          {method === "password" && step === "identifier" && emailStep === "sign-in" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4" data-testid="login-email-step">
              <AuthField label="Email">
                <input
                  type="email"
                  value={email}
                  required
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="login-email-input"
                  className={authInputCls}
                />
              </AuthField>
              <AuthField label="Password">
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  testId="login-password-input"
                />
              </AuthField>

              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => { setEmailStep("forgot"); setError(null); setResetSent(false); }}
                  data-testid="login-forgot-password-link"
                  className="text-sm text-[#D96C4A] hover:text-[#C05A3A] font-semibold transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <p data-testid="login-error" className="text-sm text-[#B54A4A] bg-[#B54A4A]/10 border-2 border-[#B54A4A]/30 rounded-2xl px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                data-testid="login-submit-button"
                className="btn-press w-full bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-6 py-3.5 font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}

          {method === "password" && step === "identifier" && emailStep === "forgot" && (
            <form onSubmit={handleForgotSubmit} className="space-y-4" data-testid="login-forgot-step">
              <AuthField
                label="Email"
                hint={
                  isConsoleOtpEnabled()
                    ? "No email yet — after you submit, open the browser console (F12) and click the reset link."
                    : "We'll send a reset link to this address."
                }
              >
                <input
                  type="email"
                  value={email}
                  required
                  autoComplete="email"
                  autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="login-forgot-email-input"
                  className={authInputCls}
                />
              </AuthField>

              {resetSent && (
                <div data-testid="login-forgot-success" className="text-sm text-[#5B7053] bg-[#5B7053]/10 border-2 border-[#5B7053]/25 rounded-2xl px-4 py-3 space-y-3">
                  <p>
                    {isConsoleOtpEnabled()
                      ? "Reset link ready — open it below (or from the browser console), then choose a new password."
                      : "Check your inbox for a password reset link. It may take a minute to arrive."}
                  </p>
                  {devResetLink && (
                    <div className="bg-white rounded-xl border border-[#8C857B]/20 p-3">
                      <a
                        href={devResetLink}
                        data-testid="login-dev-reset-link"
                        className="text-[#D96C4A] font-semibold underline break-all text-xs"
                      >
                        Open password reset link
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(devResetLink);
                            setCopiedResetLink(true);
                            setTimeout(() => setCopiedResetLink(false), 2000);
                          } catch {}
                        }}
                        data-testid="login-copy-reset-link"
                        className="mt-2 block text-xs text-[#5B6359] hover:text-[#D96C4A] font-semibold"
                      >
                        {copiedResetLink ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p data-testid="login-error" className="text-sm text-[#B54A4A] bg-[#B54A4A]/10 border-2 border-[#B54A4A]/30 rounded-2xl px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                data-testid="login-forgot-submit-button"
                className="btn-press w-full bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-6 py-3.5 font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>

              <button
                type="button"
                onClick={() => { setEmailStep("sign-in"); setError(null); setResetSent(false); }}
                data-testid="login-back-to-sign-in-button"
                className="w-full text-sm text-[#5B6359] hover:text-[#D96C4A] font-semibold transition-colors py-2"
              >
                Back to sign in
              </button>
            </form>
          )}

          {method === "password" && emailStep === "reset-password" && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4" data-testid="login-reset-password-step">
              <AuthField label="New password" hint="At least 6 characters.">
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                  testId="login-new-password-input"
                />
              </AuthField>
              <AuthField label="Confirm password">
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  testId="login-confirm-password-input"
                />
              </AuthField>

              {error && (
                <p data-testid="login-error" className="text-sm text-[#B54A4A] bg-[#B54A4A]/10 border-2 border-[#B54A4A]/30 rounded-2xl px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                data-testid="login-reset-submit-button"
                className="btn-press w-full bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-6 py-3.5 font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? "Saving…" : "Save new password"}
              </button>
            </form>
          )}

          {method === "emailOtp" && step === "identifier" && (
            <form onSubmit={handleEmailOtpSend} className="space-y-4" data-testid="login-email-otp-step">
              <AuthField
                label="Email"
                hint="Use the same email you registered with. We'll send a 6-digit code."
              >
                <input
                  type="email"
                  value={email}
                  required
                  autoComplete="email"
                  autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="login-email-otp-input"
                  className={authInputCls}
                />
              </AuthField>

              {error && (
                <p data-testid="login-error" className="text-sm text-[#B54A4A] bg-[#B54A4A]/10 border-2 border-[#B54A4A]/30 rounded-2xl px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                data-testid="login-send-email-otp-button"
                className="btn-press w-full bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-6 py-3.5 font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? "Sending…" : "Send email code"}
              </button>
            </form>
          )}

          {method === "emailOtp" && step === "otp" && (
            <form onSubmit={handleEmailOtpVerify} className="space-y-4" data-testid="login-otp-step">
              <AuthField
                label="Verification code"
                hint="Check your inbox (and spam) for the 6-digit code from Mamascript."
              >
                <input
                  type="text"
                  value={otp}
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={8}
                  autoFocus
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  data-testid="login-otp-input"
                  className={authInputCls}
                />
              </AuthField>

              {error && (
                <p data-testid="login-error" className="text-sm text-[#B54A4A] bg-[#B54A4A]/10 border-2 border-[#B54A4A]/30 rounded-2xl px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                data-testid="login-verify-button"
                className="btn-press w-full bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-6 py-3.5 font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? "Verifying…" : "Verify & sign in"}
              </button>

              <button
                type="button"
                onClick={goBackToIdentifier}
                data-testid="login-change-email-button"
                className="w-full text-sm text-[#5B6359] hover:text-[#D96C4A] font-semibold transition-colors py-2"
              >
                Change email
              </button>
            </form>
          )}

          {step === "identifier" && emailStep !== "reset-password" && (
            <p className="text-sm text-[#5B6359] mt-8 text-center">
              New to the vault?{" "}
              <Link to="/register" data-testid="login-to-register-link" className="text-[#D96C4A] hover:text-[#C05A3A] font-semibold">
                Create an account
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
