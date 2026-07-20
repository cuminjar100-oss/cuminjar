/**
 * Console dev auth — OTP codes and reset links in the browser console.
 * Production uses Supabase → Twilio WhatsApp. Keep REACT_APP_CONSOLE_OTP=false
 * (and CONSOLE_OTP=false on the backend) once WhatsApp OTP is live.
 */

export function isConsoleOtpEnabled() {
  const v = String(process.env.REACT_APP_CONSOLE_OTP || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Log the generated OTP to the browser console (dev only — not WhatsApp). */
export function logOtpToConsole(phone, otp, expiresInSeconds = 600) {
  if (!isConsoleOtpEnabled() || !otp) return;
  const minutes = Math.max(1, Math.round(expiresInSeconds / 60));
  // eslint-disable-next-line no-console
  console.info(
    `%c[Mamascript] Your verification code: ${otp}`,
    "color:#D96C4A;font-weight:bold;font-size:16px",
    `\nPhone: ${phone}`,
    `\nValid for ${minutes} minutes.`,
    "\n(Dev console OTP — set REACT_APP_CONSOLE_OTP=false for WhatsApp via Twilio.)",
  );
}

/** Log a password-reset link to the browser console (replaces email for now). */
export function logPasswordResetToConsole(email, actionLink, expiresInSeconds = 600) {
  if (!isConsoleOtpEnabled() || !actionLink) return;
  const minutes = Math.max(1, Math.round(expiresInSeconds / 60));
  // eslint-disable-next-line no-console
  console.info(
    `%c[Mamascript] Password reset link (dev) — valid ~${minutes} min`,
    "color:#D96C4A;font-weight:bold;font-size:14px",
  );
  // Own line so the URL is clickable in DevTools
  // eslint-disable-next-line no-console
  console.log(actionLink);
}
