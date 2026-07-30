import React, { useState, useEffect, useCallback } from 'react';
import AppShell from '../components/AppShell';
import { Users, Mic, Sparkles, Plus, Loader2, CheckCircle2, ChefHat, BookOpen, PartyPopper, Edit2, X, Link2, Copy, Check, MessageCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import api from '../api';
import InviteFamilyModal from '../components/InviteFamilyModal';
import RequestRecipeModal from '../components/RequestRecipeModal';
import SmartRecordModal from '../components/SmartRecordModal';
import RecipeDetailModal from '../components/RecipeDetailModal';
import StoryDetailModal from '../components/StoryDetailModal';
import FirstRunEmptyState from '../components/FirstRunEmptyState';
import { getCachedAuthUser, setCachedAuthUser, clearCachedAuthUser } from '../utils/authCache';
import { shareWithImage, buildRecipeShareText, buildStoryShareText, shareCookbookLink } from '../utils/share';

export default function Dashboard() {
  const [families, setFamilies] = useState([]);
  const [activeFamilyId, setActiveFamilyId] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [openRecipe, setOpenRecipe] = useState(null);
  const [openStory, setOpenStory] = useState(null);
  const [authUser, setAuthUser] = useState(() => getCachedAuthUser());
  const [authLoading, setAuthLoading] = useState(() => !getCachedAuthUser());
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

  useEffect(() => {
    let cancelled = false;
    api.authMe()
      .then((u) => { if (!cancelled) { setAuthUser(u); setCachedAuthUser(u); } })
      .catch(() => { if (!cancelled) { setAuthUser(null); clearCachedAuthUser(); } })
      .finally(() => { if (!cancelled) setAuthLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (active) localStorage.setItem('cuminjar_active_family', active.id); }, [active]);

  const handleRecordSaved = (r) => {
    if (r?.kind === 'recipe' && r.item) setRecipes(prev => [r.item, ...prev]);
    else if (r?.item) setStories(prev => [r.item, ...prev]);
  };

  const isFirstRun = !!authUser && !loading && !authLoading && recipes.length === 0 && stories.length === 0;
  const isBootstrapping = authLoading || loading;

  return (
    <AppShell active="home" onOpenRecord={() => setShowRecord(true)}>
      <div className="px-3 lg:px-8 py-3 lg:py-6 max-w-4xl mx-auto">
        {isBootstrapping ? (
          <div className="py-24 flex items-center justify-center text-neutral-400" data-testid="dashboard-bootstrapping">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : (
        <>
        {isFirstRun && (
          <FirstRunEmptyState
            userName={authUser?.name}
            onRecord={() => setShowRecord(true)}
            onInvite={() => setShowInvite(true)}
          />
        )}
        {!isFirstRun && (
        <>
        {/* Compact welcome + big Record button */}
        <div className="bg-gradient-to-br from-[#F7DFCE]/70 to-[#F1E8D8] rounded-2xl p-4 lg:p-8 text-center">
          <h1 className="font-serif-display text-[22px] lg:text-[34px] font-semibold text-neutral-900 leading-tight" data-testid="dashboard-greeting">
            Hi {((authUser?.name || 'Sameera').trim().split(' ')[0]) || 'there'}! Preserve a memory today.
          </h1>
          <p className="mt-1 text-[13px] lg:text-[15px] text-neutral-700 max-w-md mx-auto">Tap Record and just talk. We do the rest.</p>

          <button onClick={() => setShowRecord(true)} className="mt-4 lg:mt-6 inline-flex flex-col items-center gap-1.5 group">
            <span className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-cumin-green text-white flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
              <Mic size={36} />
            </span>
            <span className="text-cumin-green font-semibold text-[13.5px]">Tap to Record</span>
          </button>

          {/* Secondary CTA — ask family to record on WhatsApp instead */}
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setShowRequest(true)}
              data-testid="request-whatsapp-cta"
              className="inline-flex items-center gap-2.5 bg-white border-2 border-[#128C7E] text-[#128C7E] hover:bg-[#128C7E] hover:text-white transition-colors px-7 py-3.5 rounded-full text-[16px] font-semibold shadow-sm"
            >
              <MessageCircle size={20} /> Ask via WhatsApp
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-neutral-600">
            <span className="flex items-center gap-1"><ChefHat size={12} className="text-terracotta"/> Recipe</span>
            <span className="flex items-center gap-1"><BookOpen size={12} className="text-[#5D7A4E]"/> Story</span>
            <span className="flex items-center gap-1"><PartyPopper size={12} className="text-[#7A6FB0]"/> Festival</span>
          </div>
        </div>

        {/* Progress streak card — motivating momentum toward heirloom book */}
        {(() => {
          const total = recipes.length + stories.length;
          if (total === 0) return null;
          const goal = 30;
          const isUnlocked = total >= goal;
          const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const withinWeek = (item) => {
            const t = item?.created_at ? new Date(item.created_at).getTime() : 0;
            return Number.isFinite(t) && t >= oneWeekAgo;
          };
          const weekCount = recipes.filter(withinWeek).length + stories.filter(withinWeek).length;
          const remaining = Math.max(0, goal - total);
          const pct = Math.min(100, Math.round((total / goal) * 100));
          return (
            <div
              className="mt-4 lg:mt-5 bg-gradient-to-br from-[#F0EDE4] to-white border border-[#E7E0CE] rounded-2xl p-4 lg:p-5 flex items-center gap-4"
              data-testid="progress-streak-card"
            >
              <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-cumin-green/10 text-cumin-green flex items-center justify-center flex-shrink-0">
                <Sparkles size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] lg:text-[14.5px] font-semibold text-neutral-900" data-testid="streak-weekly-count">
                    {isUnlocked
                      ? '🎉 Your heirloom book is ready to order!'
                      : weekCount > 0
                        ? `You saved ${weekCount} ${weekCount === 1 ? 'memory' : 'memories'} this week`
                        : `${total} ${total === 1 ? 'memory' : 'memories'} saved so far`}
                  </p>
                  <span className="text-[11px] font-medium text-neutral-500 whitespace-nowrap">{total} / {goal}</span>
                </div>
                <p className="text-[12px] lg:text-[12.5px] text-neutral-600 mt-0.5" data-testid="streak-remaining-copy">
                  {isUnlocked
                    ? 'Preview your family book from the Heirloom Book card below.'
                    : `${remaining} more to unlock your heirloom book!`}
                </p>
                <div className="mt-2 h-1.5 bg-neutral-200/70 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-terracotta to-cumin-green rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                    data-testid="streak-progress-bar"
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Hardbound book highlight */}
        <div className="mt-4 lg:mt-5 bg-gradient-to-br from-[#F5EBDA] to-[#F7DFCE] rounded-2xl p-4 lg:p-6 flex gap-4 items-center">
          <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0 text-3xl lg:text-4xl">📕</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-terracotta tracking-[0.15em] uppercase">Heirloom Book</p>
            <h3 className="font-serif-display text-[16px] lg:text-[20px] font-semibold text-neutral-900 leading-tight mt-0.5">Print your best memories as a hardbound family book</h3>
            <p className="text-[12px] lg:text-[13.5px] text-neutral-700 mt-1 leading-snug">Every page has a QR code — scan it and hear your loved one’s voice reading the recipe or story to you. English on paper, their voice forever.</p>
            <p className="text-[10.5px] lg:text-[11px] text-neutral-500 mt-1.5 italic leading-snug" data-testid="heirloom-book-eligibility">Unlocked once your jar has 30 entries.</p>
          </div>
        </div>

        {/* Family group (auto-provisioned single "<Name>'s Family") */}
        <div className="mt-4 bg-white rounded-2xl border border-neutral-200/70 p-3.5 lg:p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-semibold text-neutral-900 flex items-center gap-1.5"><Users size={14}/> Family group</p>
          </div>
          {families.length === 0 ? (
            <div className="text-center py-3">
              <Loader2 className="animate-spin text-neutral-400 mx-auto" size={16} />
              <p className="text-[12.5px] text-neutral-500 mt-1.5">Setting up your family jar…</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {families.map(f => (
                <button key={f.id} onClick={() => setActiveFamilyId(f.id)} className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full transition-colors ${f.id === activeFamilyId ? 'bg-cumin-green text-white' : 'bg-[#F5EDDD] text-neutral-800'}`}>
                  {f.coverPhoto ? <img loading="lazy" decoding="async" src={f.coverPhoto} alt="" className="w-4 h-4 rounded-full object-cover" /> : <Users size={11} />}
                  {f.name}
                </button>
              ))}
              <button onClick={() => setShowInvite(true)} className="text-[12px] px-2.5 py-1 rounded-full border border-dashed border-neutral-300 text-neutral-600 hover:border-cumin-green hover:text-cumin-green transition-colors">+ Invite</button>
            </div>
          )}
          {active && (
            <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
              <div className="text-[11.5px] text-neutral-500 truncate">
                <b className="text-neutral-800">Cookbook link</b> · share <span className="text-neutral-800">{active.name}</span> with the family
              </div>
              <ShareCookbookButton family={active} />
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
        </>
        )}
        </>
        )}
      </div>

      {showInvite && <InviteFamilyModal onClose={() => setShowInvite(false)} />}
      {showRecord && <SmartRecordModal onClose={() => setShowRecord(false)} familyId={active?.id} onSaved={handleRecordSaved} />}
      {showRequest && <RequestRecipeModal onClose={() => setShowRequest(false)} />}
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
        {r.cover ? <img loading="lazy" decoding="async" src={r.cover} alt={r.title} className="w-full h-full object-cover" /> : (
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

function ShareCookbookButton({ family }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(family?.share_token ? `${window.location.origin}/cookbook/${family.share_token}` : null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setUrl(family?.share_token ? `${window.location.origin}/cookbook/${family.share_token}` : null);
    setCopied(false);
  }, [family?.share_token, family?.id]);

  const ensureUrl = async () => {
    if (url) return url;
    const r = await api.shareFamily(family.id);
    const link = `${window.location.origin}${r.path}`;
    setUrl(link);
    return link;
  };

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const link = await ensureUrl();
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        toast({ title: 'Cookbook link copied!', description: 'Share it with your family.' });
      } catch { toast({ title: 'Cookbook link ready', description: link }); }
    } catch (e) {
      toast({ title: 'Could not create link', description: e?.response?.data?.detail || e?.message });
    } finally { setBusy(false); }
  };

  const copyExisting = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Link copied' });
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard denied */ }
  };

  const shareToWhatsApp = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const link = await ensureUrl();
      await shareCookbookLink({ family, url: link });
    } catch (e) {
      toast({ title: 'Could not share', description: e?.response?.data?.detail || e?.message });
    } finally { setBusy(false); }
  };

  if (!url) {
    return (
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={enable} disabled={busy} data-testid="share-cookbook-enable" className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-cumin-green text-white hover:bg-[#324A2F] transition-colors disabled:opacity-70">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />} Share cookbook
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={shareToWhatsApp} data-testid="share-cookbook-whatsapp" title="Share the cookbook link on WhatsApp" className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-[#25D366] text-white hover:bg-[#1EBE5B] transition-colors disabled:opacity-70">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
        WhatsApp
      </button>
      <button type="button" onClick={copyExisting} data-testid="share-cookbook-copy" title={url} className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full border border-cumin-green text-cumin-green hover:bg-cumin-green hover:text-white transition-colors">
        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy link</>}
      </button>
    </div>
  );
}

