import React from 'react';
import { X, Clock, Users as UsersIcon, Heart, ChefHat, Share2 } from 'lucide-react';

export default function RecipeDetailModal({ recipe, onClose, onLike }) {
  if (!recipe) return null;
  const r = recipe;

  const share = () => {
    const body = `${r.title}\n\nBy ${r.author || 'CuminJar family'}${r.serves ? ` · Serves ${r.serves}` : ''}${r.time ? ` · ${r.time}` : ''}\n\n${(r.ingredients || []).length ? 'Ingredients:\n' + r.ingredients.map(i => `• ${i}`).join('\n') + '\n\n' : ''}${(r.steps || []).length ? 'Steps:\n' + r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n\n' : ''}Saved on CuminJar`;
    window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
      onClick={onClose}
      data-testid="recipe-detail-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl max-h-[95vh] overflow-y-auto"
        data-testid="recipe-detail-modal"
      >
        {/* Cover */}
        <div className="relative">
          <div className="aspect-[16/10] bg-neutral-100 w-full">
            {r.cover ? (
              <img src={r.cover} alt={r.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-300">
                <ChefHat size={64} />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            data-testid="recipe-detail-close"
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition-colors"
          >
            <X size={18} />
          </button>
          {onLike && (
            <button
              onClick={() => onLike(r.id)}
              data-testid="recipe-detail-like"
              className="absolute top-3 right-16 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition-colors"
            >
              <Heart size={16} className={r.liked ? 'text-terracotta fill-terracotta' : 'text-terracotta'} fill={r.liked ? 'currentColor' : 'none'} />
            </button>
          )}
          <button
            onClick={share}
            data-testid="recipe-detail-share"
            className="absolute top-3 right-[116px] w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition-colors"
            title="Share on WhatsApp"
          >
            <Share2 size={16} className="text-[#25D366]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-7">
          <h2 className="font-serif-display text-[26px] sm:text-[32px] font-semibold text-neutral-900 leading-tight">{r.title}</h2>
          <p className="text-[12.5px] text-neutral-500 mt-1">
            By {r.author || 'You'}{r.region ? ` · ${r.region}` : ''}
          </p>

          <div className="flex items-center gap-4 mt-3 text-[13px] text-neutral-700">
            {r.serves && <span className="flex items-center gap-1"><UsersIcon size={14} /> Serves {r.serves}</span>}
            {r.time && <span className="flex items-center gap-1"><Clock size={14} /> {r.time}</span>}
          </div>

          {(r.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {r.tags.map(t => <span key={t} className="text-[11px] bg-[#F5EDDD] text-neutral-700 px-2.5 py-0.5 rounded-full">{t}</span>)}
            </div>
          )}

          {(r.ingredients || []).length > 0 && (
            <section className="mt-6">
              <h3 className="font-serif-display text-[18px] font-semibold text-neutral-900 mb-2">Ingredients</h3>
              <ul className="space-y-1.5 text-[14px] text-neutral-800">
                {r.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-cumin-green">•</span>
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(r.steps || []).length > 0 && (
            <section className="mt-6">
              <h3 className="font-serif-display text-[18px] font-semibold text-neutral-900 mb-2">Steps</h3>
              <ol className="space-y-3 text-[14px] text-neutral-800">
                {r.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cumin-green text-white text-[12px] font-semibold flex items-center justify-center">{idx + 1}</span>
                    <span className="flex-1 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {(!r.ingredients || r.ingredients.length === 0) && (!r.steps || r.steps.length === 0) && r.transcript_en && (
            <section className="mt-6">
              <h3 className="font-serif-display text-[18px] font-semibold text-neutral-900 mb-2">Recipe</h3>
              <p className="text-[14px] text-neutral-800 whitespace-pre-wrap leading-relaxed">{r.transcript_en}</p>
            </section>
          )}

          {r.source_language && r.source_language !== 'en-IN' && (
            <p className="mt-6 text-[11.5px] text-neutral-500 italic">Originally recorded in {r.source_language}</p>
          )}
        </div>
      </div>
    </div>
  );
}
