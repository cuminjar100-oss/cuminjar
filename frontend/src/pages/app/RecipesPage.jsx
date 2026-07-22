import React from 'react';
import AppShell from '../../components/AppShell';
import { mockRecipes } from '../../mock';
import { Plus, Filter, Heart, Clock, Users as UsersIcon } from 'lucide-react';

export default function RecipesPage() {
  return (
    <AppShell active="recipes">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Family Recipes</h1>
            <p className="text-neutral-500 text-[14px] mt-1">A jar full of your family’s flavors.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white border border-neutral-200 px-4 py-2.5 rounded-lg text-[14px] text-neutral-700 hover:border-cumin-green transition-colors"><Filter size={15} /> Filter</button>
            <button className="flex items-center gap-2 bg-cumin-green text-white px-4 py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#324A2F] transition-colors"><Plus size={15} /> Add Recipe</button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6 flex-wrap">
          {['All', 'Favorites', 'Voice Recipes', 'South Indian', 'North Indian', 'Coastal', 'Punjabi'].map((c, i) => (
            <button key={c} className={`text-[13px] px-4 py-1.5 rounded-full transition-colors ${i === 0 ? 'bg-cumin-green text-white' : 'bg-white border border-neutral-200 text-neutral-700 hover:border-cumin-green'}`}>{c}</button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {mockRecipes.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-neutral-200/70 overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={r.cover} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center hover:bg-white transition-colors">
                  <Heart size={16} className="text-terracotta" />
                </button>
              </div>
              <div className="p-5">
                <h3 className="font-serif-display text-[20px] font-semibold text-neutral-900">{r.title}</h3>
                <p className="text-[12px] text-neutral-500 mt-1">By {r.author} · {r.region}</p>
                <div className="flex items-center gap-4 mt-3 text-[12.5px] text-neutral-600">
                  <span className="flex items-center gap-1"><UsersIcon size={13} /> Serves {r.serves}</span>
                  <span className="flex items-center gap-1"><Clock size={13} /> {r.time}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {r.tags.map(t => <span key={t} className="text-[11px] bg-[#F5EDDD] text-neutral-700 px-2.5 py-0.5 rounded-full">{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
