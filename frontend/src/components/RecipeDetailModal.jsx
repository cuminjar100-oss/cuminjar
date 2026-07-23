import React, { useState, useEffect } from 'react';
import { X, Clock, Users as UsersIcon, Heart, ChefHat, Share2, RefreshCw, Loader2, Pencil, Check, Plus, Trash2 } from 'lucide-react';
import api from '../api';
import { shareWithImage, buildRecipeShareText } from '../utils/share';

export default function RecipeDetailModal({ recipe, onClose, onLike, onUpdated }) {
  const [r, setR] = useState(recipe);
  const [regenerating, setRegenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);

  useEffect(() => { setR(recipe); setEditing(false); setDraft(null); }, [recipe]);

  if (!r) return null;

  const handleShare = () => shareWithImage({ title: r.title, text: buildRecipeShareText(r), imageUrl: r.cover });

  const regenerate = async () => {
    if (regenerating) return;
    setRegenerating(true);
    try {
      const updated = await api.regenerateRecipeCover(r.id);
      setR(updated);
      if (onUpdated) onUpdated(updated);
    } catch (e) { /* button re-enables */ }
    finally { setRegenerating(false); }
  };

  const startEdit = () => {
    setDraft({
      title: r.title || '',
      serves: r.serves || '',
      time: r.time || '',
      ingredients: [...(r.ingredients || [])],
      steps: [...(r.steps || [])],
    });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setDraft(null); };

  const saveEdit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await api.updateRecipe(r.id, {
        title: draft.title.trim() || r.title,
        serves: draft.serves.trim(),
        time: draft.time.trim(),
        ingredients: draft.ingredients.map(x => x.trim()).filter(Boolean),
        steps: draft.steps.map(x => x.trim()).filter(Boolean),
      });
      setR(updated);
      setEditing(false);
      setDraft(null);
      if (onUpdated) onUpdated(updated);
    } catch (e) { /* keep editing */ }
    finally { setSaving(false); }
  };

  const setIngredient = (idx, val) => setDraft(d => ({ ...d, ingredients: d.ingredients.map((x, i) => i === idx ? val : x) }));
  const addIngredient = () => setDraft(d => ({ ...d, ingredients: [...d.ingredients, ''] }));
  const removeIngredient = (idx) => setDraft(d => ({ ...d, ingredients: d.ingredients.filter((_, i) => i !== idx) }));
  const setStep = (idx, val) => setDraft(d => ({ ...d, steps: d.steps.map((x, i) => i === idx ? val : x) }));
  const addStep = () => setDraft(d => ({ ...d, steps: [...d.steps, ''] }));
  const removeStep = (idx) => setDraft(d => ({ ...d, steps: d.steps.filter((_, i) => i !== idx) }));

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
              <div className="w-full h-full flex items-center justify-center text-neutral-300"><ChefHat size={64} /></div>
            )}
            {regenerating && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[13px] gap-2">
                <Loader2 size={16} className="animate-spin" /> Cooking up a new cover…
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={regenerate}
            disabled={regenerating}
            data-testid="recipe-detail-regenerate-cover"
            title="Regenerate AI cover"
            className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-[12px] font-medium text-neutral-800 hover:bg-white transition-colors disabled:opacity-70"
          >
            <RefreshCw size={13} className={regenerating ? 'animate-spin' : ''} />
            {regenerating ? 'Generating…' : 'Regenerate cover'}
          </button>

          <button onClick={onClose} data-testid="recipe-detail-close" className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition-colors">
            <X size={18} />
          </button>
          {onLike && (
            <button onClick={() => onLike(r.id)} data-testid="recipe-detail-like" className="absolute top-3 right-16 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition-colors">
              <Heart size={16} className={r.liked ? 'text-terracotta fill-terracotta' : 'text-terracotta'} fill={r.liked ? 'currentColor' : 'none'} />
            </button>
          )}
          <button onClick={handleShare} data-testid="recipe-detail-share" className="absolute top-3 right-[116px] w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition-colors" title="Share">
            <Share2 size={16} className="text-[#25D366]" />
          </button>
          {!editing && (
            <button onClick={startEdit} data-testid="recipe-detail-edit" className="absolute top-3 right-[168px] w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition-colors" title="Edit recipe">
              <Pencil size={15} className="text-neutral-700" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 sm:p-7">
          {!editing ? (
            <>
              <h2 className="font-serif-display text-[26px] sm:text-[32px] font-semibold text-neutral-900 leading-tight">{r.title}</h2>
              <p className="text-[12.5px] text-neutral-500 mt-1">By {r.author || 'You'}{r.region ? ` · ${r.region}` : ''}</p>
              <div className="flex items-center gap-4 mt-3 text-[13px] text-neutral-700">
                {r.serves && <span className="flex items-center gap-1"><UsersIcon size={14} /> Serves {r.serves}</span>}
                {r.time && <span className="flex items-center gap-1"><Clock size={14} /> {r.time}</span>}
              </div>
              {(r.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {r.tags.map(t => <span key={t} className="text-[11px] bg-[#F5EDDD] text-neutral-700 px-2.5 py-0.5 rounded-full">{t}</span>)}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2.5">
              <input
                data-testid="edit-recipe-title"
                value={draft.title}
                onChange={e => setDraft({ ...draft, title: e.target.value })}
                placeholder="Recipe title"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[18px] font-serif-display font-semibold focus:outline-none focus:border-cumin-green"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  data-testid="edit-recipe-serves"
                  value={draft.serves}
                  onChange={e => setDraft({ ...draft, serves: e.target.value })}
                  placeholder="Serves (e.g. 4)"
                  className="border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green"
                />
                <input
                  data-testid="edit-recipe-time"
                  value={draft.time}
                  onChange={e => setDraft({ ...draft, time: e.target.value })}
                  placeholder="Time (e.g. 30 mins)"
                  className="border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green"
                />
              </div>
            </div>
          )}

          {/* Voice playback */}
          {r.audio_src && !editing && (
            <section className="mt-5 bg-[#F7F1E5] border border-[#E9DEC6] rounded-xl p-3">
              <p className="text-[11.5px] font-semibold text-neutral-700 uppercase tracking-wider mb-2">Original voice</p>
              <audio controls src={r.audio_src} className="w-full" data-testid="recipe-audio-player">
                Your browser does not support the audio element.
              </audio>
            </section>
          )}

          {/* Ingredients */}
          <section className="mt-6">
            <h3 className="font-serif-display text-[18px] font-semibold text-neutral-900 mb-2">Ingredients</h3>
            {!editing ? (
              (r.ingredients || []).length > 0 ? (
                <ul className="space-y-1.5 text-[14px] text-neutral-800">
                  {r.ingredients.map((ing, idx) => (
                    <li key={idx} className="flex gap-2"><span className="text-cumin-green">•</span><span>{ing}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-neutral-400 italic">No ingredients yet — tap edit to add.</p>
              )
            ) : (
              <div className="space-y-2">
                {draft.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      data-testid={`edit-ing-${idx}`}
                      value={ing}
                      onChange={e => setIngredient(idx, e.target.value)}
                      placeholder="e.g. 2 tbsp coconut"
                      className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-cumin-green"
                    />
                    <button type="button" onClick={() => removeIngredient(idx)} className="w-8 h-8 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center"><Trash2 size={14} /></button>
                  </div>
                ))}
                <button type="button" onClick={addIngredient} data-testid="edit-add-ingredient" className="text-[13px] text-cumin-green font-medium flex items-center gap-1 hover:underline"><Plus size={13} /> Add ingredient</button>
              </div>
            )}
          </section>

          {/* Steps */}
          <section className="mt-6">
            <h3 className="font-serif-display text-[18px] font-semibold text-neutral-900 mb-2">Steps</h3>
            {!editing ? (
              (r.steps || []).length > 0 ? (
                <ol className="space-y-3 text-[14px] text-neutral-800">
                  {r.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cumin-green text-white text-[12px] font-semibold flex items-center justify-center">{idx + 1}</span>
                      <span className="flex-1 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[13px] text-neutral-400 italic">No steps yet — tap edit to add.</p>
              )
            ) : (
              <div className="space-y-2">
                {draft.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="flex-shrink-0 w-6 h-6 mt-2 rounded-full bg-cumin-green text-white text-[12px] font-semibold flex items-center justify-center">{idx + 1}</span>
                    <textarea
                      data-testid={`edit-step-${idx}`}
                      value={step}
                      rows={2}
                      onChange={e => setStep(idx, e.target.value)}
                      placeholder="Describe this step…"
                      className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-cumin-green resize-none"
                    />
                    <button type="button" onClick={() => removeStep(idx)} className="w-8 h-8 mt-2 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center"><Trash2 size={14} /></button>
                  </div>
                ))}
                <button type="button" onClick={addStep} data-testid="edit-add-step" className="text-[13px] text-cumin-green font-medium flex items-center gap-1 hover:underline"><Plus size={13} /> Add step</button>
              </div>
            )}
          </section>

          {!editing && (!r.ingredients || r.ingredients.length === 0) && (!r.steps || r.steps.length === 0) && r.transcript_en && (
            <section className="mt-6">
              <h3 className="font-serif-display text-[18px] font-semibold text-neutral-900 mb-2">Recipe transcript</h3>
              <p className="text-[14px] text-neutral-800 whitespace-pre-wrap leading-relaxed">{r.transcript_en}</p>
            </section>
          )}

          {r.source_language && r.source_language !== 'en-IN' && !editing && (
            <p className="mt-6 text-[11.5px] text-neutral-500 italic">Originally recorded in {r.source_language}</p>
          )}

          {editing && (
            <div className="mt-6 flex gap-2 sticky bottom-0 bg-white pt-3 pb-1">
              <button type="button" onClick={cancelEdit} className="flex-1 border border-neutral-200 py-3 rounded-lg text-[14px] font-medium hover:bg-neutral-50">Cancel</button>
              <button type="button" onClick={saveEdit} disabled={saving} data-testid="edit-save" className="flex-1 bg-cumin-green text-white py-3 rounded-lg text-[14px] font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
