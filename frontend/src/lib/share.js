/** Build shareable text and open WhatsApp (no backend / API integration). */

const MAX_STEPS = 40;
const MAX_STEP_CHARS = 500;
const MAX_BODY_CHARS = 3500;

function stepText(stepRaw) {
  const step = typeof stepRaw === "string" ? { text: stepRaw } : stepRaw;
  return String(step?.text || "").trim();
}

function bulletList(items) {
  return (items || [])
    .filter(Boolean)
    .map((item) => `• ${item}`)
    .join("\n");
}

function formatSteps(steps) {
  const list = (steps || []).slice(0, MAX_STEPS);
  const lines = list.map((raw, i) => {
    let text = stepText(raw);
    if (text.length > MAX_STEP_CHARS) text = `${text.slice(0, MAX_STEP_CHARS)}…`;
    return `${i + 1}. ${text}`;
  });
  if ((steps || []).length > MAX_STEPS) {
    lines.push(`… and ${steps.length - MAX_STEPS} more steps`);
  }
  return lines.join("\n");
}

function metaLine(entry) {
  const parts = [];
  if (entry.prep_time) parts.push(`Prep: ${entry.prep_time}`);
  if (entry.cook_time) parts.push(`Cook: ${entry.cook_time}`);
  if (entry.servings) parts.push(`Serves: ${entry.servings}`);
  return parts.length ? parts.join(" · ") : "";
}

const ENTRY_LABELS = {
  recipe: "Recipe",
  ritual: "Ritual",
  festival: "Festival",
  song: "Song",
};

/**
 * Plain-text card for WhatsApp / system share.
 * @param {object} entry
 * @param {{ name?: string } | null} book - vault
 * @param {string} [entryUrl] - deep link to this entry in the app
 */
export function formatEntryForShare(entry, book = null, entryUrl = "") {
  if (!entry) return "";

  const typeLabel = ENTRY_LABELS[entry.entry_type] || "Entry";
  const lines = [
    `*${entry.title || "Untitled"}*`,
    `${typeLabel} · From ${entry.created_by_name || "Family"}`,
  ];

  if (book?.name) lines.push(`Vault: ${book.name}`);

  const meta = metaLine(entry);
  if (meta) lines.push(meta);

  if (entry.description?.trim()) {
    lines.push("", entry.description.trim());
  }

  if (entry.entry_type === "recipe") {
    const ing = bulletList(entry.ingredients);
    if (ing) lines.push("", "*Ingredients*", ing);
  }

  if (entry.entry_type === "ritual" || entry.entry_type === "festival") {
    if (entry.occasion) lines.push("", `Occasion: ${entry.occasion}`);
    if (entry.time_of_year) lines.push(`When: ${entry.time_of_year}`);
    if (entry.participants) lines.push(`Who: ${entry.participants}`);
    const items = bulletList(entry.items_needed);
    if (items) lines.push("", "*Items needed*", items);
    if (entry.significance?.trim()) lines.push("", entry.significance.trim());
  }

  if (entry.entry_type === "song") {
    if (entry.language) lines.push("", `Language: ${entry.language}`);
    if (entry.occasion) lines.push(`Occasion: ${entry.occasion}`);
    if (entry.when_sung) lines.push(`Sung: ${entry.when_sung}`);
    if (entry.lyrics_original?.trim()) {
      lines.push("", "*Lyrics (original)*", entry.lyrics_original.trim());
    }
    if (entry.lyrics_english?.trim()) {
      lines.push("", "*Lyrics (English)*", entry.lyrics_english.trim());
    }
  }

  const stepsHeader =
    entry.entry_type === "recipe"
      ? "*Steps*"
      : entry.entry_type === "ritual"
        ? "*How it's performed*"
        : entry.entry_type === "festival"
          ? "*How we celebrate*"
          : entry.entry_type === "song"
            ? "*How it goes*"
            : "*Steps*";
  const steps = formatSteps(entry.steps);
  if (steps) lines.push("", stepsHeader, steps);

  if (entry.notes?.trim()) {
    lines.push("", `*Family notes*`, entry.notes.trim());
  }

  if (entryUrl) {
    lines.push("", "Open in Mamascript:", entryUrl);
  }

  lines.push("", "— Shared from Mamascript");

  let body = lines.join("\n");
  if (body.length > MAX_BODY_CHARS) {
    body = `${body.slice(0, MAX_BODY_CHARS - 1)}…`;
  }
  return body;
}

export function entryShareUrl(entryId) {
  if (!entryId || typeof window === "undefined") return "";
  return `${window.location.origin}/entries/${entryId}`;
}

/**
 * Share via native sheet when available, otherwise WhatsApp deep link.
 */
export function shareViaWhatsApp({ text, url, title }) {
  const message = text || "";
  const link = url || "";

  if (typeof navigator !== "undefined" && navigator.share) {
    return navigator
      .share({
        title: title || "Mamascript",
        text: message,
        url: link || undefined,
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        openWhatsAppLink(message);
      });
  }

  openWhatsAppLink(message);
}

function openWhatsAppLink(text) {
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, "_blank", "noopener,noreferrer");
}
