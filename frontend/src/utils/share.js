// Share helper — attempts native Web Share API with the cover image (works on mobile
// browsers, including WhatsApp/Instagram/Messages picker). Falls back to a WhatsApp
// deep-link with text-only if Web Share with files isn't supported.

async function dataUrlToFile(dataUrl, filename) {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}

export async function shareWithImage({ title, text, imageUrl }) {
  const cleanText = text || '';
  let file = null;
  if (imageUrl) {
    file = await dataUrlToFile(imageUrl, `${(title || 'cuminjar').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.jpg`);
  }

  // Native share with file (opens WhatsApp on mobile, system share sheet on iOS/Android)
  if (file && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: title || 'CuminJar', text: cleanText });
      return 'shared-native';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
      // fall through to fallback
    }
  }

  // Fallback: text-only WhatsApp deep link
  window.open(`https://wa.me/?text=${encodeURIComponent(cleanText)}`, '_blank');
  return 'shared-whatsapp-text';
}

export function buildRecipeShareText(r) {
  return `${r.title}\n\nBy ${r.author || 'CuminJar family'}${r.serves ? ` · Serves ${r.serves}` : ''}${r.time ? ` · ${r.time}` : ''}\n\n${(r.ingredients || []).length ? 'Ingredients:\n' + r.ingredients.map(i => `• ${i}`).join('\n') + '\n\n' : ''}${(r.steps || []).length ? 'Steps:\n' + r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n\n' : ''}Saved on CuminJar 🫙`;
}

export function buildStoryShareText(s) {
  return `${s.title}\n\n${(s.excerpt || s.transcript_en || '').slice(0, 2000)}\n\nSaved on CuminJar 🫙`;
}
