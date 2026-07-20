/** Email normalization and validation for auth forms. */

export function normalizeEmail(raw) {
  const s = String(raw || "").trim().toLowerCase();
  return s || null;
}

export function validateEmail(normalized) {
  return (
    typeof normalized === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  );
}

export function emailValidationError(raw) {
  const normalized = normalizeEmail(raw);
  if (!normalized) return "Please enter your email address.";
  if (!validateEmail(normalized)) return "Please enter a valid email address.";
  return null;
}
