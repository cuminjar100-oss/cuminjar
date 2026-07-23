// Share helper — attempts native Web Share API with a CuminJar-branded image
// (works on mobile browsers, including WhatsApp/Instagram/Messages picker).
// Falls back to a WhatsApp deep-link when Web Share with files isn't supported.
//
// Every share includes the CuminJar identity:
// - If a cover image exists → we composite a "CuminJar 🫙" ribbon at the bottom
//   before sharing so the recipient always sees the brand.
// - If no cover exists → we share the branded CuminJar card at
//   /cuminjar-share.png.

const BRAND_FALLBACK = '/cuminjar-share.png';

async function urlToImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function brandImage(imgSrc) {
  // Draw the source image onto a canvas and overlay a warm CuminJar ribbon
  // in the bottom-right corner so shared images always carry the brand.
  try {
    const img = await urlToImage(imgSrc);
    const w = img.naturalWidth || 1080;
    const h = img.naturalHeight || 1080;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    // Bottom gradient wash for readability
    const ribbonH = Math.max(48, Math.round(h * 0.11));
    const grad = ctx.createLinearGradient(0, h - ribbonH, 0, h);
    grad.addColorStop(0, 'rgba(31,27,22,0)');
    grad.addColorStop(1, 'rgba(31,27,22,0.72)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - ribbonH, w, ribbonH);

    // CuminJar wordmark
    const brandY = h - ribbonH / 2 + Math.round(ribbonH * 0.09);
    const fontSize = Math.max(20, Math.round(ribbonH * 0.42));
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${fontSize}px Georgia, "Fraunces", serif`;
    const cuminMetric = ctx.measureText('Cumin');
    const jarMetric = ctx.measureText('Jar');
    const jarText = 'Jar 🫙';
    const totalWidth = cuminMetric.width + ctx.measureText(jarText).width;
    const startX = Math.round(w - totalWidth - Math.round(w * 0.035));
    ctx.fillStyle = '#F7BFA0';
    ctx.fillText('Cumin', startX, brandY);
    ctx.fillStyle = '#DFEAD8';
    ctx.fillText(jarText, startX + cuminMetric.width, brandY);

    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    return blob;
  } catch (err) {
    return null;
  }
}

async function fallbackToBrandFile() {
  try {
    const r = await fetch(BRAND_FALLBACK);
    const blob = await r.blob();
    return new File([blob], 'cuminjar.png', { type: blob.type || 'image/png' });
  } catch { return null; }
}

export async function shareWithImage({ title, text, imageUrl }) {
  const cleanText = text || '';
  let file = null;

  if (imageUrl) {
    const branded = await brandImage(imageUrl);
    if (branded) {
      file = new File([branded], `${(title || 'cuminjar').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.jpg`, { type: 'image/jpeg' });
    }
  }
  if (!file) {
    file = await fallbackToBrandFile();
  }

  if (file && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: title || 'CuminJar', text: cleanText });
      return 'shared-native';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(cleanText)}`, '_blank');
  return 'shared-whatsapp-text';
}

export async function shareCookbookLink({ family, url }) {
  const familyName = family?.name || 'our family';
  const text = `📖 Come browse the ${familyName} cookbook on CuminJar — voice recipes, family stories and traditions preserved forever.\n\n${url}\n\nPreserved on CuminJar 🫙`;
  const imageUrl = family?.coverPhoto || null;
  return shareWithImage({ title: `${familyName} Cookbook · CuminJar`, text, imageUrl });
}

export function buildRecipeShareText(r) {
  return `${r.title}\n\nBy ${r.author || 'CuminJar family'}${r.serves ? ` · Serves ${r.serves}` : ''}${r.time ? ` · ${r.time}` : ''}\n\n${(r.ingredients || []).length ? 'Ingredients:\n' + r.ingredients.map(i => `• ${i}`).join('\n') + '\n\n' : ''}${(r.steps || []).length ? 'Steps:\n' + r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n\n' : ''}Saved on CuminJar 🫙`;
}

export function buildStoryShareText(s) {
  return `${s.title}\n\n${(s.excerpt || s.transcript_en || '').slice(0, 2000)}\n\nSaved on CuminJar 🫙`;
}
