import React, { useState, useEffect, useCallback } from 'react';
import AppShell from '../components/AppShell';
import { Users, Mic, Sparkles, Plus, Loader2, CheckCircle2, ChefHat, BookOpen, PartyPopper, Edit2, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import api from '../api';
import InviteFamilyModal from '../components/InviteFamilyModal';
import SmartRecordModal from '../components/SmartRecordModal';
import RecipeDetailModal from '../components/RecipeDetailModal';
import StoryDetailModal from '../components/StoryDetailModal';
import { shareWithImage, buildRecipeShareText, buildStoryShareText } from '../utils/share';

export default function Dashboard() {
  const [families, setFamilies] = useState([]);
  const [activeFamilyId, setActiveFamilyId] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [openRecipe, setOpenRecipe] = useState(null);
  const [openStory, setOpenStory] = useState(null);
  const { toast } = useToast();

  const active = families.find(f => f.id === activeFamilyId) || null;

  const loadEverything = useCallback(async () => {
    setLoading(true);
    try {
      const [fam, rec, sto] = await Promise.all([
        api.listFamilies(), api.listRecipes(), api.listStories()
      ]);
      setFamilies(fam);
      setRecipes(rec);
      setStories(sto);
      if (fam.length > 0) {
        const saved = localStorage.getItem('cuminjar_active_family');
        const target = fam.find(f => f.id === saved) || fam[0];
        setActiveFamilyId(target.id);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadEverything(); }, [loadEverything]);

  useEffect(() => { if (active) localStorage.setItem('cuminjar_active_family', active.id); }, [active]);

  const handleRecordSaved = (r) => {
    if (r?.kind === 'recipe' && r.item) setRecipes(prev => [r.item, ...prev]);
    else if (r?.item) setStories(prev => [r.item, ...prev]);
  };

  return (
    <AppShell active="home" onOpenRecord={() => setShowRecord(true)}>
      <div className="px-3 lg:px-8 py-3 lg:py-6 max-w-4xl mx-auto">
        {/* Compact welcome + big Record button */}
        <div className="bg-gradient-to-br from-[#F7DFCE]/70 to-[#F1E8D8] rounded-2xl p-4 lg:p-8 text-center">
          <h1 className="font-serif-display text-[22px] lg:text-[34px] font-semibold text-neutral-900 leading-tight">
            Hi Meera! Preserve a memory today.
          </h1>
          <p className="mt-1 text-[13px] lg:text-[15px] text-neutral-700 max-w-md mx-auto">Tap Record and just talk. We do the rest.</p>

          <button onClick={() => setShowRecord(true)} className="mt-4 lg:mt-6 inline-flex flex-col items-center gap-1.5 group">
            <span className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-cumin-green text-white flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
              <Mic size={36} />
            </span>
            <span className="text-cumin-green font-semibold text-[13.5px]">Tap to Record</span>
          </button>

          <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-neutral-600">
            <span className="flex items-center gap-1"><ChefHat size={12} className="text-terracotta"/> Recipe</span>
            <span className="flex items-center gap-1"><BookOpen size={12} className="text-[#5D7A4E]"/> Story</span>
            <span className="flex items-center gap-1"><PartyPopper size={12} className="text-[#7A6FB0]"/> Festival</span>
          </div>
        </div>

        {/* Hardbound book highlight */}
        <div className="mt-4 lg:mt-5 bg-gradient-to-br from-[#F5EBDA] to-[#F7DFCE] rounded-2xl p-4 lg:p-6 flex gap-4 items-center">
          <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0 text-3xl lg:text-4xl">📕</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-terracotta tracking-[0.15em] uppercase">Heirloom Book</p>
            <h3 className="font-serif-display text-[16px] lg:text-[20px] font-semibold text-neutral-900 leading-tight mt-0.5">Print your best memories as a hardbound family book</h3>
            <p className="text-[12px] lg:text-[13.5px] text-neutral-700 mt-1 leading-snug">Every page has a QR code — scan it and hear your loved one’s voice reading the recipe or story to you. English on paper, their voice forever.</p>
          </div>
        </div>

        {/* Family groups */}
        <div className="mt-4 bg-white rounded-2xl border border-neutral-200/70 p-3.5 lg:p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-neutral-900 flex items-center gap-1.5"><Users size={14}/> Family groups</p>
            <button type="button" onClick={() => setShowCreateFamily(true)} className="text-[12px] font-medium text-cumin-green flex items-center gap-1 hover:underline">
              <Plus size={12}/> New
            </button>
          </div>
          {families.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-[12.5px] text-neutral-500 mb-2">Create your first family space.</p>
              <button onClick={() => setShowCreateFamily(true)} className="bg-cumin-green text-white px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium">Create Family Group</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {families.map(f => (
                <button key={f.id} onClick={() => setActiveFamilyId(f.id)} className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full transition-colors ${f.id === activeFamilyId ? 'bg-cumin-green text-white' : 'bg-[#F5EDDD] text-neutral-800'}`}>
                  {f.coverPhoto ? <img src={f.coverPhoto} alt="" className="w-4 h-4 rounded-full object-cover" /> : <Users size={11} />}
                  {f.name}
                </button>
              ))}
              <button onClick={() => setShowInvite(true)} className="text-[12px] px-2.5 py-1 rounded-full border border-dashed border-neutral-300 text-neutral-600 hover:border-cumin-green hover:text-cumin-green transition-colors">+ Invite</button>
            </div>
          )}
        </div>

        {/* Recent recipes */}
        <section className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif-display text-[18px] lg:text-[22px] font-semibold text-neutral-900">Recent recipes</h2>
            <a href="/app/recipes" className="text-[12px] text-cumin-green font-medium">See all</a>
          </div>
          {loading ? (
            <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-neutral-400" size={18} /></div>
          ) : recipes.length === 0 ? (
            <div className="bg-white border border-neutral-200/70 rounded-xl p-4 text-center">
              <p className="text-[13px] text-neutral-500">Nothing yet. Tap the big <b>Record</b> button above to add your first recipe.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3">
              {recipes.slice(0, 4).map(r => <RecipeCardMini key={r.id} r={r} onOpen={() => setOpenRecipe(r)} onShare={() => shareRecipe(r)} />)}
            </div>
          )}
        </section>

        {/* Recent stories */}
        <section className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif-display text-[18px] lg:text-[22px] font-semibold text-neutral-900">Recent stories &amp; festivals</h2>
            <a href="/app/stories" className="text-[12px] text-cumin-green font-medium">See all</a>
          </div>
          {stories.length === 0 ? (
            <div className="bg-white border border-neutral-200/70 rounded-xl p-4 text-center">
              <p className="text-[13px] text-neutral-500">No stories or festival memories yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stories.slice(0, 3).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setOpenStory(s)}
                  data-testid={`story-mini-${s.id}`}
                  className="w-full bg-white border border-neutral-200/70 rounded-xl p-3 flex items-start gap-3 text-left hover:border-cumin-green transition-colors"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${s.kind === 'festival' ? 'bg-[#E4DEF4]' : 'bg-[#DFEAD8]'}`}>
                    {s.kind === 'festival' ? <PartyPopper size={15} className="text-[#7A6FB0]" /> : <BookOpen size={15} className="text-[#5D7A4E]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13.5px] text-neutral-900 truncate">{s.title}</p>
                    <p className="text-[12px] text-neutral-500 line-clamp-2">{s.excerpt || s.transcript_en}</p>
                  </div>
                  <span
                    onClick={(e) => { e.stopPropagation(); shareStory(s); }}
                    role="button"
                    className="text-[11px] text-[#25D366] font-medium pt-0.5 cursor-pointer"
                  >Share</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {showInvite && <InviteFamilyModal onClose={() => setShowInvite(false)} />}
      {showRecord && <SmartRecordModal onClose={() => setShowRecord(false)} familyId={active?.id} onSaved={handleRecordSaved} />}
      {openRecipe && (
        <RecipeDetailModal
          recipe={openRecipe}
          onClose={() => setOpenRecipe(null)}
          onUpdated={(u) => {
            setRecipes(prev => prev.map(x => x.id === u.id ? u : x));
            setOpenRecipe(u);
          }}
        />
      )}
      {openStory && <StoryDetailModal story={openStory} onClose={() => setOpenStory(null)} />}
      {showCreateFamily && (
        <CreateFamilyModal onClose={() => setShowCreateFamily(false)} onCreated={async () => { setShowCreateFamily(false); await loadEverything(); }} />
      )}
    </AppShell>
  );
}

function shareRecipe(r) {
  shareWithImage({ title: r.title, text: buildRecipeShareText(r), imageUrl: r.cover });
}
function shareStory(s) {
  shareWithImage({ title: s.title, text: buildStoryShareText(s), imageUrl: s.cover });
}

function RecipeCardMini({ r, onOpen, onShare }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`recipe-mini-${r.id}`}
      className="bg-white rounded-xl border border-neutral-200/70 overflow-hidden text-left w-full hover:border-cumin-green transition-colors"
    >
      <div className="aspect-square bg-neutral-100 relative">
        {r.cover ? <img src={r.cover} alt={r.title} className="w-full h-full object-cover" /> : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300"><ChefHat size={30} /></div>
        )}
        <span
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          role="button"
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-[#25D366] hover:bg-white transition-colors cursor-pointer"
          title="Share on WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
        </span>
      </div>
      <div className="p-2.5">
        <p className="font-semibold text-[13px] text-neutral-900 truncate">{r.title}</p>
        <p className="text-[11px] text-neutral-500 truncate">{r.serves ? `Serves ${r.serves}` : ''}{r.time ? ` · ${r.time}` : ''}</p>
      </div>
    </button>
  );
}

function CreateFamilyModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [lang, setLang] = useState('English');
  const [cover, setCover] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCover(reader.result);
    reader.readAsDataURL(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createFamily({ name, description: '', language: lang, coverPhoto: cover });
      toast({ title: 'Family created!' });
      onCreated();
    } catch (err) {
      toast({ title: 'Could not create', description: err?.response?.data?.detail || err?.message });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <form onSubmit={submit} className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h3 className="font-serif-display text-[22px] font-semibold">Create family group</h3>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <input required autoFocus value={name} onChange={e => setName(e.target.value.slice(0, 50))} placeholder="Family name (e.g., Rao Family)" className="w-full border border-neutral-200 rounded-lg px-3 py-3 text-[15px] focus:outline-none focus:border-cumin-green" />
          <select value={lang} onChange={e => setLang(e.target.value)} className="w-full border border-neutral-200 rounded-lg px-3 py-3 text-[15px] focus:outline-none focus:border-cumin-green">
            {['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi'].map(l => <option key={l}>{l}</option>)}
          </select>
          <label className="flex items-center gap-3 border border-dashed border-neutral-300 rounded-lg px-3 py-3 cursor-pointer text-[13.5px] text-neutral-600">
            {cover ? <img src={cover} alt="cover" className="w-14 h-14 rounded object-cover" /> : <div className="w-14 h-14 rounded bg-neutral-100 flex items-center justify-center"><ImageIcon size={18} className="text-neutral-400"/></div>}
            <span>Add family cover photo</span>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
          <button disabled={saving} type="submit" className="w-full mt-2 bg-cumin-green text-white py-3.5 rounded-lg font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {saving && <Loader2 size={15} className="animate-spin" />} Create
          </button>
        </div>
      </form>
    </div>
  );
}
