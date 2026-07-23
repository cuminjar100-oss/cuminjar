import React, { useState, useEffect, useCallback } from 'react';
import AppShell from '../components/AppShell';
import { Users, Mic, Sparkles, Plus, Loader2, CheckCircle2, ChefHat, BookOpen, PartyPopper, Edit2, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import api from '../api';
import InviteFamilyModal from '../components/InviteFamilyModal';
import SmartRecordModal from '../components/SmartRecordModal';

export default function Dashboard() {
  const [families, setFamilies] = useState([]);
  const [activeFamilyId, setActiveFamilyId] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [showCreateFamily, setShowCreateFamily] = useState(false);
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
      <div className="px-4 lg:px-8 py-4 lg:py-6">
        {/* Welcome + Big Record button */}
        <div className="bg-gradient-to-br from-[#F7DFCE]/70 to-[#F1E8D8] rounded-3xl p-6 lg:p-8 text-center">
          <h1 className="font-serif-display text-[28px] lg:text-[36px] font-semibold text-neutral-900 leading-tight">
            Hi Meera! What memory shall we preserve today?
          </h1>
          <p className="mt-2 text-[14px] lg:text-[15px] text-neutral-700 max-w-xl mx-auto">Tap Record and just talk in any Indian language. We handle transcription, translation and formatting.</p>

          <button
            onClick={() => setShowRecord(true)}
            className="mt-6 inline-flex flex-col items-center gap-2 group"
          >
            <span className="w-28 h-28 lg:w-32 lg:h-32 rounded-full bg-cumin-green text-white flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
              <Mic size={44} />
            </span>
            <span className="text-cumin-green font-semibold text-[15px]">Tap to Record</span>
          </button>

          <div className="mt-5 flex items-center justify-center gap-3 lg:gap-5 flex-wrap text-[12px] text-neutral-600">
            <span className="flex items-center gap-1.5"><ChefHat size={13} className="text-terracotta"/> Recipe</span>
            <span className="flex items-center gap-1.5"><BookOpen size={13} className="text-[#5D7A4E]"/> Story</span>
            <span className="flex items-center gap-1.5"><PartyPopper size={13} className="text-[#7A6FB0]"/> Festival</span>
          </div>
        </div>

        {/* Family groups switcher */}
        <div className="mt-5 bg-white rounded-2xl border border-neutral-200/70 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] font-semibold text-neutral-900 flex items-center gap-1.5"><Users size={15}/> Your family groups</p>
            <button
              type="button"
              onClick={() => {
                if (families.length >= 1) {
                  toast({ title: 'Upgrade required', description: 'Free plan allows only 1 family group. Upgrade to Plus.' });
                  return;
                }
                setShowCreateFamily(true);
              }}
              className="text-[12.5px] font-medium text-cumin-green flex items-center gap-1 hover:underline"
            >
              <Plus size={13}/> New <span className="text-[10px] bg-terracotta text-white px-1.5 py-0.5 rounded-full ml-0.5">PLUS</span>
            </button>
          </div>
          {families.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-[13.5px] text-neutral-500 mb-3">Create your first family space to start saving memories.</p>
              <button onClick={() => setShowCreateFamily(true)} className="bg-cumin-green text-white px-4 py-2 rounded-lg text-[13.5px] font-medium hover:bg-[#324A2F] transition-colors">Create Family Group</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {families.map(f => (
                <button key={f.id} onClick={() => setActiveFamilyId(f.id)} className={`inline-flex items-center gap-2 text-[13px] px-3 py-1.5 rounded-full transition-colors ${f.id === activeFamilyId ? 'bg-cumin-green text-white' : 'bg-[#F5EDDD] text-neutral-800 hover:bg-[#EFE3CB]'}`}>
                  {f.coverPhoto ? <img src={f.coverPhoto} alt="" className="w-5 h-5 rounded-full object-cover" /> : <Users size={13} />}
                  {f.name}
                </button>
              ))}
              <button onClick={() => setShowInvite(true)} className="text-[13px] px-3 py-1.5 rounded-full border border-dashed border-neutral-300 text-neutral-700 hover:border-cumin-green hover:text-cumin-green transition-colors">+ Invite family</button>
            </div>
          )}
        </div>

        {/* Recent recipes */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif-display text-[22px] font-semibold text-neutral-900">Recent recipes</h2>
            <a href="/app/recipes" className="text-[13px] text-cumin-green font-medium hover:underline">See all</a>
          </div>
          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-neutral-400" size={20} /></div>
          ) : recipes.length === 0 ? (
            <div className="bg-white border border-neutral-200/70 rounded-2xl p-6 text-center">
              <p className="text-[14px] text-neutral-500">No recipes yet. Tap the big <b>Record</b> button above and start with your first recipe.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {recipes.slice(0, 4).map(r => <RecipeCardMini key={r.id} r={r} onShare={() => shareRecipe(r)} />)}
            </div>
          )}
        </section>

        {/* Recent stories */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif-display text-[22px] font-semibold text-neutral-900">Recent stories &amp; festivals</h2>
            <a href="/app/stories" className="text-[13px] text-cumin-green font-medium hover:underline">See all</a>
          </div>
          {stories.length === 0 ? (
            <div className="bg-white border border-neutral-200/70 rounded-2xl p-6 text-center">
              <p className="text-[14px] text-neutral-500">No stories or festival memories yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stories.slice(0, 3).map(s => (
                <div key={s.id} className="bg-white border border-neutral-200/70 rounded-xl p-3 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${s.kind === 'festival' ? 'bg-[#E4DEF4]' : 'bg-[#DFEAD8]'}`}>
                    {s.kind === 'festival' ? <PartyPopper size={16} className="text-[#7A6FB0]" /> : <BookOpen size={16} className="text-[#5D7A4E]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] text-neutral-900 truncate">{s.title}</p>
                    <p className="text-[12.5px] text-neutral-500 line-clamp-2">{s.excerpt || s.transcript_en}</p>
                  </div>
                  <button onClick={() => shareStory(s)} className="text-[11px] text-[#25D366] font-medium">Share</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showInvite && <InviteFamilyModal onClose={() => setShowInvite(false)} />}
      {showRecord && <SmartRecordModal onClose={() => setShowRecord(false)} familyId={active?.id} onSaved={handleRecordSaved} />}
      {showCreateFamily && (
        <CreateFamilyModal onClose={() => setShowCreateFamily(false)} onCreated={async () => { setShowCreateFamily(false); await loadEverything(); }} />
      )}
    </AppShell>
  );
}

function shareRecipe(r) {
  const body = `${r.title}\n\nBy ${r.author || 'CuminJar family'}${r.serves ? ` · Serves ${r.serves}` : ''}${r.time ? ` · ${r.time}` : ''}\n\n${(r.ingredients || []).length ? 'Ingredients:\n' + r.ingredients.map(i => `• ${i}`).join('\n') + '\n\n' : ''}${(r.steps || []).length ? 'Steps:\n' + r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n\n' : ''}Saved on CuminJar 🫙`;
  window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank');
}
function shareStory(s) {
  const body = `${s.title}\n\n${(s.excerpt || s.transcript_en || '').slice(0, 800)}\n\nSaved on CuminJar 🫙`;
  window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank');
}

function RecipeCardMini({ r, onShare }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200/70 overflow-hidden">
      <div className="aspect-square bg-neutral-100 relative">
        {r.cover ? <img src={r.cover} alt={r.title} className="w-full h-full object-cover" /> : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300"><ChefHat size={30} /></div>
        )}
        <button onClick={onShare} className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-[#25D366] hover:bg-white transition-colors" title="Share on WhatsApp">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
        </button>
      </div>
      <div className="p-2.5">
        <p className="font-semibold text-[13px] text-neutral-900 truncate">{r.title}</p>
        <p className="text-[11px] text-neutral-500 truncate">{r.serves ? `Serves ${r.serves}` : ''}{r.time ? ` · ${r.time}` : ''}</p>
      </div>
    </div>
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
