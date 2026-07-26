import React, { useState, useEffect, useCallback } from 'react';
import AppShell from '../../components/AppShell';
import { Plus, Filter, Heart, Clock, Users as UsersIcon, Loader2 } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/use-toast';
import SmartRecordModal from '../../components/SmartRecordModal';
import RecipeDetailModal from '../../components/RecipeDetailModal';
import { shareWithImage, buildRecipeShareText } from '../../utils/share';

const REGIONS = ['All', 'Favorites'];

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
    return true;
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
                      shareWithImage({ title: r.title, text: buildRecipeShareText(r), imageUrl: r.cover });
                    }}
                    role="button"
                    className="absolute top-3 right-14 w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
                    title="Share"
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

      {showModal && (
        <SmartRecordModal
          onClose={() => setShowModal(false)}
          onSaved={(r) => {
            if (r?.kind === 'recipe' && r.item) {
              setRecipes(prev => [r.item, ...prev]);
              toast({ title: 'Recipe saved!' });
            }
          }}
        />
      )}
      {openRecipe && (
        <RecipeDetailModal
          recipe={openRecipe}
          onClose={() => setOpenRecipe(null)}
          onLike={toggleLike}
          onUpdated={(u) => {
            setRecipes(prev => prev.map(x => x.id === u.id ? u : x));
            setOpenRecipe(u);
          }}
        />
      )}
    </AppShell>
  );
}
