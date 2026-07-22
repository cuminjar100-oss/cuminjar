/**
 * Supabase Auth helpers — sign up, sign in, profile mapping.
 */
import { api } from "@/lib/api";
import { isConsoleOtpEnabled, logOtpToConsole, logPasswordResetToConsole } from "@/lib/devOtp";
import { getSupabase } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/email";
import { normalizeMobile } from "@/lib/phone";

function authErrorMessage(err) {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") return err;
  return err.message || "Something went wrong. Please try again.";
}

/** Friendly copy for email/password sign-in failures. */
function signInErrorMessage(err) {
  if (!err) return "Invalid email or password.";
  const code = err.code;
  const msg = String(err.message || "");
  const lower = msg.toLowerCase();

  if (code === "invalid_credentials" || lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (code === "email_not_confirmed" || lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (code === "otp_disabled" || lower.includes("signups not allowed for otp")) {
    return "No account found for that email. Create an account first, then sign in with a code.";
  }
  if (lower.includes("token has expired") || lower.includes("otp_expired")) {
    return "That code has expired. Request a new one.";
  }
  if (lower.includes("token is invalid") || code === "otp_expired") {
    return "Invalid or expired code. Please try again.";
  }
  // emergent-main.js (or similar) may read the fetch body before Supabase parses the 400 response
  if (lower.includes("body stream already read") || lower.includes("failed to execute 'json'")) {
    return "Invalid email or password.";
  }
  if (err.status === 400 && (lower.includes("invalid") || lower.includes("credential"))) {
    return "Invalid email or password.";
  }
  return authErrorMessage(err);
}

/** Map Supabase user + profile to the shape the app expects. */
export function toAppUser(authUser, profile) {
  if (!authUser) return null;
  return {
    user_id: authUser.id,
    email: profile?.email || authUser.email || "",
    mobile: profile?.mobile || authUser.phone || "",
    name: profile?.name || authUser.user_metadata?.name || "User",
    created_at: profile?.created_at || authUser.created_at,
  };
}

export async function fetchProfile(userId) {
  const supabase = getSupabase();
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, mobile, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(authErrorMessage(error));
  return data;
}

export async function resolveAppUser() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw new Error(authErrorMessage(error));
  if (!session?.user) return null;
  try {
    const profile = await fetchProfile(session.user.id);
    return toAppUser(session.user, profile);
  } catch {
    return toAppUser(session.user, null);
  }
}

export async function signUpWithEmail({ name, email, mobile, password }) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.");

  const normalizedEmail = normalizeEmail(email);
  const normalizedMobile = normalizeMobile(mobile);

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        name: String(name || "").trim(),
        mobile: normalizedMobile,
      },
    },
  });
  if (error) throw new Error(authErrorMessage(error));
  if (!data.user) throw new Error("Sign up failed. Please try again.");

  // Profile row is created by the DB trigger handle_new_user() from options.data above.
  // Do not upsert from the client — RLS blocks insert without a session, and upsert
  // conflicts with the trigger-created row.

  if (!data.session) {
    throw new Error(
      "Account created. Check your email to confirm your address, then sign in."
    );
  }

  const profile = await fetchProfile(data.user.id);
  return toAppUser(data.user, profile);
}

export async function signInWithEmail({ email, password }) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
  if (error) throw new Error(signInErrorMessage(error));
  try {
    const profile = await fetchProfile(data.user.id);
    return toAppUser(data.user, profile);
  } catch {
    return toAppUser(data.user, null);
  }
}

export async function requestPasswordReset(email) {
  const normalized = normalizeEmail(email);
  const redirectTo = `${window.location.origin}/login`;

  if (isConsoleOtpEnabled()) {
    const { data } = await api.post("/auth/dev/password-reset/send", {
      email: normalized,
      redirect_to: redirectTo,
    });
    logPasswordResetToConsole(data.email, data.action_link, data.expires_in);
    return { email: data.email, devConsole: true, action_link: data.action_link };
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo });
  if (error) throw new Error(authErrorMessage(error));
  return { email: normalized };
}

export async function updatePassword(password) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(authErrorMessage(error));
  if (!data.user) throw new Error("Could not update your password. Please try again.");
  const profile = await fetchProfile(data.user.id);
  return toAppUser(data.user, profile);
}

/**
 * Send login OTP to email (Supabase Auth → SMTP / Resend).
 * Requires Email provider enabled and ideally custom SMTP (Resend) in Supabase.
 * shouldCreateUser: false — register first, then sign in with email code.
 */
export async function sendEmailOtp(emailRaw) {
  const email = normalizeEmail(emailRaw);
  if (!email) throw new Error("Please enter a valid email address.");

  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  if (error) throw new Error(authErrorMessage(error));
  return { email };
}

export async function verifyEmailOtp({ email, otp }) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const normalized = normalizeEmail(email);
  const token = String(otp || "").trim();
  if (!normalized) throw new Error("Please enter a valid email address.");
  if (!token) throw new Error("Enter the verification code from your email.");

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalized,
    token,
    type: "email",
  });
  if (error) throw new Error(authErrorMessage(error));
  if (!data.user) throw new Error("Could not verify that code. Please try again.");

  const profile = await fetchProfile(data.user.id);
  return toAppUser(data.user, profile);
}

/** @deprecated WhatsApp OTP on hold — kept for possible future re-enable. */
export async function sendPhoneOtp(mobileRaw) {
  const phone = normalizeMobile(mobileRaw);
  if (!phone) throw new Error("Enter a valid 10-digit mobile number.");

  if (isConsoleOtpEnabled()) {
    const { data } = await api.post("/auth/dev/phone-otp/send", { phone });
    logOtpToConsole(data.phone, data.otp, data.expires_in);
    return { phone: data.phone, channel: "console" };
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { channel: "whatsapp" },
  });
  if (error) throw new Error(authErrorMessage(error));
  return { phone, channel: "whatsapp" };
}

/** @deprecated WhatsApp OTP on hold. */
export async function verifyPhoneOtp({ phone, otp }) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const token = String(otp || "").trim();

  if (isConsoleOtpEnabled()) {
    const { data: devData } = await api.post("/auth/dev/phone-verify", { phone, otp: token });
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: devData.token_hash,
      type: devData.type || "email",
    });
    if (error) throw new Error(authErrorMessage(error));
    const profile = await fetchProfile(data.user.id);
    return toAppUser(data.user, profile);
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) throw new Error(authErrorMessage(error));
  const profile = await fetchProfile(data.user.id);
  return toAppUser(data.user, profile);
}

export async function signOutSupabase() {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function onAuthStateChange(callback) {
  const supabase = getSupabase();
  if (!supabase) {
    callback("INITIAL_SESSION", null);
    return () => {};
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}
