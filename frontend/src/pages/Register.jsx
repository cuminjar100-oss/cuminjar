import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, formatApiError } from "@/context/AuthContext";
import { signUpWithEmail } from "@/lib/supabaseAuth";
import { emailValidationError } from "@/lib/email";
import { mobileValidationError } from "@/lib/phone";
import AuthField, { authInputCls } from "@/components/AuthField";
import PasswordInput from "@/components/PasswordInput";

export default function Register() {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const invitedEmail = searchParams.get("email");
  const invitedMobile = searchParams.get("mobile");

  useEffect(() => {
    const e = searchParams.get("email");
    const m = searchParams.get("mobile");
    if (e) setEmail(e);
    if (m) setMobile(m);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const emailErr = emailValidationError(email);
      if (emailErr) {
        setError(emailErr);
        return;
      }

      const mobileErr = mobileValidationError(mobile);
      if (mobileErr) {
        setError(mobileErr);
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords don't match.");
        return;
      }

      const user = await signUpWithEmail({ name, email, mobile, password });
      setUser(user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.message || formatApiError(err, "We couldn't create your account."));
    } finally {
      setBusy(false);
    }
  };

  const loginHref = () => {
    const params = new URLSearchParams();
    if (email.trim()) params.set("email", email.trim());
    if (mobile.trim()) params.set("mobile", mobile.trim());
    const q = params.toString();
    return q ? `/login?${q}` : "/login";
  };

  return (
    <div data-testid="register-screen" className="min-h-screen w-full bg-[#FDFBF7] flex items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-md animate-fadeUp">
        <div className="mb-8">
          <div className="w-14 h-14 rounded-3xl bg-[#D96C4A] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(217,108,74,0.25)] mb-5">
            <span className="font-display text-2xl">ms</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#2C302B] leading-tight">
            {invitedEmail || invitedMobile ? "You're invited!" : "Start your family vault"}
          </h1>
          <p className="text-[#5B6359] mt-2 leading-relaxed">
            {invitedEmail || invitedMobile
              ? "Add your details to join the vault — sign in with email or mobile anytime."
              : "Save the entries that bring everyone back to the table."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField label="Your name">
            <input
              type="text"
              value={name}
              required
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              placeholder="Grandma Rose"
              data-testid="register-name-input"
              className={authInputCls}
            />
          </AuthField>
          <AuthField label="Email">
            <input
              type="email"
              value={email}
              required
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              data-testid="register-email-input"
              className={authInputCls}
            />
          </AuthField>
          <AuthField label="Mobile number" hint="India (+91). Enter 10 digits without country code.">
            <input
              type="tel"
              value={mobile}
              required
              autoComplete="tel"
              inputMode="numeric"
              onChange={(e) => setMobile(e.target.value)}
              placeholder="98765 43210"
              data-testid="register-mobile-input"
              className={authInputCls}
            />
          </AuthField>
          <AuthField label="Password" hint="At least 6 characters — used when you sign in with email.">
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              testId="register-password-input"
            />
          </AuthField>
          <AuthField label="Confirm password">
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              testId="register-confirm-password-input"
            />
          </AuthField>

          {error && (
            <p data-testid="register-error" className="text-sm text-[#B54A4A] bg-[#B54A4A]/10 border-2 border-[#B54A4A]/30 rounded-2xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            data-testid="register-submit-button"
            className="btn-press w-full bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-6 py-3.5 font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? "Creating your account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-[#5B6359] mt-8 text-center">
          Already have an account?{" "}
          <Link to={loginHref()} data-testid="register-to-login-link" className="text-[#D96C4A] hover:text-[#C05A3A] font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
