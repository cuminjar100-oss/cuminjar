import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, ChefHat, BookOpen, PartyPopper, Clock, Users as UsersIcon, Share2 } from 'lucide-react';
import api from '../api';
import RecipeDetailModal from '../components/RecipeDetailModal';
import StoryDetailModal from '../components/StoryDetailModal';
import { shareWithImage, buildRecipeShareText, buildStoryShareText } from '../utils/share';

export default function PublicCookbook() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, error: null, family: null, recipes: [], stories: [] });
  const [openRecipe, setOpenRecipe] = useState(null);
  const [openStory, setOpenStory] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.publicCookbook(token);
      setState({ loading: false, error: null, ...data });
    } catch (e) {
      setState({ loading: false, error: e?.response?.data?.detail || 'This cookbook is not available.', family: null, recipes: [], stories: [] });
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="animate-spin text-neutral-400" size={26} />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🫙</div>
        <h1 className="font-serif-display text-[28px] font-semibold text-neutral-900">Cookbook not found</h1>
        <p className="text-[14px] text-neutral-600 mt-2 max-w-sm">{state.error} The family may have unshared this link.</p>
        <Link to="/" className="mt-6 text-cumin-green font-medium hover:underline">Go to CuminJar home →</Link>
      </div>
    );
  }

  const { family, recipes, stories } = state;

  const shareCookbook = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `${family.name} — Family Cookbook`,
        text: `Browse ${family.name}'s recipes and stories on CuminJar 🫙`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      window.alert('Link copied to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Public header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          <Link to="/" className="font-serif-display text-[20px] font-semibold">
            <span className="text-terracotta">Cumin</span><span className="text-cumin-green">Jar</span>
          </Link>
          <button onClick={shareCookbook} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-cumin-green hover:underline" data-testid="cookbook-share">
            <Share2 size={13} /> Share this cookbook
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 pt-10 pb-6 text-center">
        {family.coverPhoto ? (
          <img src={family.coverPhoto} alt={family.name} className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-white shadow-lg" />
        ) : (
          <div className="w-24 h-24 mx-auto rounded-full bg-[#F5EDDD] flex items-center justify-center text-4xl">🫙</div>
        )}
        <p className="mt-4 text-[11px] font-semibold tracking-[0.18em] text-terracotta uppercase">Family Cookbook</p>
        <h1 className="mt-1 font-serif-display text-[36px] sm:text-[48px] font-semibold text-neutral-900 leading-tight">{family.name}</h1>
        {family.description && (
          <p className="mt-3 text-neutral-600 text-[14.5px] max-w-xl mx-auto leading-relaxed">{family.description}</p>
        )}
        <p className="mt-4 text-[12px] text-neutral-500 italic">Preserved with love · Voices, recipes and stories of a family</p>
      </section>

      {/* Recipes */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 pt-6">
        <h2 className="font-serif-display text-[24px] font-semibold text-neutral-900 flex items-center gap-2">
          <ChefHat size={18} className="text-terracotta" /> Recipes ({recipes.length})
        </h2>
        {recipes.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-neutral-500 italic">No recipes shared yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
            {recipes.map(r => (
              <button
                type="button"
                key={r.id}
                onClick={() => setOpenRecipe(r)}
                data-testid={`public-recipe-${r.id}`}
                className="bg-white rounded-2xl border border-neutral-200/70 overflow-hidden hover:shadow-lg transition-shadow group text-left w-full"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                  {r.cover ? (
                    <img src={r.cover} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300"><ChefHat size={40} /></div>
                  )}
                  <span
                    onClick={(e) => { e.stopPropagation(); shareWithImage({ title: r.title, text: buildRecipeShareText(r), imageUrl: r.cover }); }}
                    role="button"
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
                    title="Share"
                  >
                    <Share2 size={14} className="text-[#25D366]" />
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-serif-display text-[18px] font-semibold text-neutral-900 leading-tight">{r.title}</h3>
                  <p className="text-[11.5px] text-neutral-500 mt-0.5">By {r.author}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11.5px] text-neutral-600">
                    {r.serves && <span className="flex items-center gap-1"><UsersIcon size={12} /> Serves {r.serves}</span>}
                    {r.time && <span className="flex items-center gap-1"><Clock size={12} /> {r.time}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Stories */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 pt-10 pb-16">
        <h2 className="font-serif-display text-[24px] font-semibold text-neutral-900 flex items-center gap-2">
          <BookOpen size={18} className="text-[#5D7A4E]" /> Stories &amp; Festivals ({stories.length})
        </h2>
        {stories.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-neutral-500 italic">No stories shared yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            {stories.map(s => (
              <button
                type="button"
                key={s.id}
                onClick={() => setOpenStory(s)}
                data-testid={`public-story-${s.id}`}
                className="bg-white rounded-2xl border border-neutral-200/70 p-5 hover:shadow-lg transition-shadow text-left"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${s.kind === 'festival' ? 'bg-[#E4DEF4]' : 'bg-[#DFEAD8]'}`}>
                    {s.kind === 'festival' ? <PartyPopper size={16} className="text-[#7A6FB0]" /> : <BookOpen size={16} className="text-[#5D7A4E]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif-display text-[18px] font-semibold text-neutral-900 leading-tight">{s.title}</h3>
                    <p className="text-[11.5px] text-neutral-500 mt-0.5">By {s.author}</p>
                    <p className="mt-2 text-[13.5px] text-neutral-700 leading-relaxed line-clamp-3">{s.excerpt || s.transcript_en}</p>
                    <div className="mt-2 flex items-center gap-1 text-[11.5px] text-neutral-500"><Clock size={11} /> {s.mins} min listen</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Footer CTA */}
      <footer className="border-t border-neutral-200 bg-white/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 text-center">
          <p className="text-[13px] text-neutral-600">Love this cookbook? Start your own family jar.</p>
          <Link to="/" className="mt-3 inline-block bg-cumin-green text-white px-5 py-2.5 rounded-lg text-[13.5px] font-medium hover:bg-[#324A2F] transition-colors">
            Try CuminJar free
          </Link>
        </div>
      </footer>

      {openRecipe && <RecipeDetailModal recipe={openRecipe} onClose={() => setOpenRecipe(null)} readOnly />}
      {openStory && <StoryDetailModal story={openStory} onClose={() => setOpenStory(null)} />}
    </div>
  );
}
