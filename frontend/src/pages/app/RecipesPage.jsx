import React, { useState, useEffect, useCallback } from 'react';
import AppShell from '../../components/AppShell';
import { Plus, Filter, Heart, Clock, Users as UsersIcon, Loader2, X } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/use-toast';
import MediaTranscribeInput from '../../components/MediaTranscribeInput';
import RecipeDetailModal from '../../components/RecipeDetailModal';

const REGIONS = ['All', 'Favorites', 'South Indian', 'North Indian', 'Coastal', 'Punjabi'];

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [openRecipe, setOpenRecipe] = useState(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setRecipes(await api.listRecipes()); } catch (e) { toast({ title: 'Failed to load recipes' }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const toggleLike = async (id) => {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, liked: !r.liked } : r));
    try { await api.likeRecipe(id); } catch (e) { load(); }
  };

  const filtered = recipes.filter(r => {
    if (filter === 'All') return true;
    if (filter === 'Favorites') return r.liked;
    return r.region === filter;
  });

  return (
    <AppShell active="recipes">
      <div className="px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Family Recipes</h1>
            <p className="text-neutral-500 text-[14px] mt-1">A jar full of your family’s flavors.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white border border-neutral-200 px-4 py-2.5 rounded-lg text-[14px] text-neutral-700 hover:border-cumin-green transition-colors"><Filter size={15} /> Filter</button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-cumin-green text-white px-4 py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#324A2F] transition-colors"><Plus size={15} /> Add Recipe</button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6 flex-wrap">
          {REGIONS.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`text-[13px] px-4 py-1.5 rounded-full transition-colors ${filter === c ? 'bg-cumin-green text-white' : 'bg-white border border-neutral-200 text-neutral-700 hover:border-cumin-green'}`}>{c}</button>
          ))}
        </div>

        {loading ? (
          <div className="mt-12 flex items-center justify-center text-neutral-500"><Loader2 className="animate-spin" size={22} /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {filtered.map(r => (
              <button
                type="button"
                key={r.id}
                onClick={() => setOpenRecipe(r)}
                data-testid={`recipe-card-${r.id}`}
                className="bg-white rounded-2xl border border-neutral-200/70 overflow-hidden hover:shadow-lg transition-shadow group text-left w-full"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {r.cover && <img src={r.cover} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                  <span
                    onClick={(e) => { e.stopPropagation(); toggleLike(r.id); }}
                    role="button"
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
                  >
                    <Heart size={16} className={r.liked ? 'text-terracotta fill-terracotta' : 'text-terracotta'} fill={r.liked ? 'currentColor' : 'none'} />
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      const body = `${r.title}\n\nBy ${r.author || 'CuminJar family'}${r.serves ? ` · Serves ${r.serves}` : ''}${r.time ? ` · ${r.time}` : ''}\n\n${(r.ingredients || []).length ? 'Ingredients:\n' + r.ingredients.map(i => `• ${i}`).join('\n') + '\n\n' : ''}${(r.steps || []).length ? 'Steps:\n' + r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n\n' : ''}Saved on CuminJar`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank');
                    }}
                    role="button"
                    className="absolute top-3 right-14 w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
                    title="Share on WhatsApp"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-serif-display text-[20px] font-semibold text-neutral-900">{r.title}</h3>
                  <p className="text-[12px] text-neutral-500 mt-1">By {r.author} · {r.region}</p>
                  <div className="flex items-center gap-4 mt-3 text-[12.5px] text-neutral-600">
                    <span className="flex items-center gap-1"><UsersIcon size={13} /> Serves {r.serves}</span>
                    <span className="flex items-center gap-1"><Clock size={13} /> {r.time}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(r.tags || []).map(t => <span key={t} className="text-[11px] bg-[#F5EDDD] text-neutral-700 px-2.5 py-0.5 rounded-full">{t}</span>)}
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-neutral-500">No recipes yet. Add your first one!</div>
            )}
          </div>
        )}
      </div>

      {showModal && <AddRecipeModal onClose={() => setShowModal(false)} onSaved={(r) => { setRecipes(prev => [r, ...prev]); setShowModal(false); toast({ title: 'Recipe saved!' }); }} />}
      {openRecipe && <RecipeDetailModal recipe={openRecipe} onClose={() => setOpenRecipe(null)} onLike={toggleLike} />}
    </AppShell>
  );
}

function AddRecipeModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', author: '', region: 'South Indian', serves: '4', time: '30 mins', tags: '', cover: '', transcript_en: '', source_kind: 'text', source_language: '' });
  const [saving, setSaving] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, cover: reader.result }));
    reader.readAsDataURL(f);
  };

  const handleTranscribed = ({ transcript_en, language, kind }) => {
    // Merge transcript into form; try to auto-fill title if empty
    const firstLine = (transcript_en || '').split('\n')[0].slice(0, 60);
    setForm(prev => ({
      ...prev,
      transcript_en: transcript_en || '',
      source_kind: kind,
      source_language: language || '',
      title: prev.title || firstLine,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await api.createRecipe({
        title: form.title,
        author: form.author || 'You',
        region: form.region,
        serves: form.serves,
        time: form.time,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        cover: form.cover || null,
        transcript_en: form.transcript_en || null,
        source_kind: form.source_kind || 'text',
        source_language: form.source_language || null,
      });
      onSaved(saved);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-6" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif-display text-[24px] font-semibold">Add a recipe</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={16} /></button>
        </div>

        <MediaTranscribeInput onTranscribed={handleTranscribed} />

        <div className="space-y-3 mt-4">
          <input required placeholder="Recipe title (e.g., Paati’s Sambar)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green" />
          <input placeholder="Author (who taught you)" value={form.author} onChange={e => setForm({...form, author: e.target.value})} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green" />
          <div className="grid grid-cols-3 gap-2">
            <select value={form.region} onChange={e => setForm({...form, region: e.target.value})} className="border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green">
              {['South Indian', 'North Indian', 'Coastal', 'Punjabi'].map(x => <option key={x}>{x}</option>)}
            </select>
            <input placeholder="Serves" value={form.serves} onChange={e => setForm({...form, serves: e.target.value})} className="border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green" />
            <input placeholder="Time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green" />
          </div>
          <input placeholder="Tags (comma-separated)" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green" />
          <textarea placeholder="Recipe details (auto-filled from voice/photo — feel free to edit)" rows={5} value={form.transcript_en} onChange={e => setForm({...form, transcript_en: e.target.value})} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green resize-none" />
          <label className="flex items-center gap-3 border border-dashed border-neutral-300 rounded-lg px-3 py-3 cursor-pointer text-[13.5px] text-neutral-600">
            {form.cover ? <img src={form.cover} alt="cover" className="w-14 h-14 rounded object-cover" /> : <div className="w-14 h-14 rounded bg-neutral-100" />}
            <span>Upload cover photo</span>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        </div>
        <button disabled={saving} type="submit" className="w-full mt-5 bg-cumin-green text-white py-3 rounded-lg font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
          {saving && <Loader2 size={15} className="animate-spin" />} Save Recipe
        </button>
      </form>
    </div>
  );
}
