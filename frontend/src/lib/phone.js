/** Normalize and validate Indian mobile numbers (default country +91). */

export function normalizeMobile(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return null;
}

export function validateMobile(normalized) {
  return typeof normalized === "string" && /^\+91[6-9]\d{9}$/.test(normalized);
}

export function mobileValidationError(raw) {
  const normalized = normalizeMobile(raw);
  if (!normalized) return "Enter a valid 10-digit mobile number.";
  if (!validateMobile(normalized)) return "Enter a valid Indian mobile number.";
  return null;
}

/** Display as +91 98765 43210 */
export function formatMobileDisplay(normalized) {
  if (!normalized || !normalized.startsWith("+91")) return normalized || "";
  const local = normalized.slice(3);
  if (local.length !== 10) return normalized;
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}
