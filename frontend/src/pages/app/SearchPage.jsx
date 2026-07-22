import React, { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import { Search as SearchIcon } from 'lucide-react';
import api from '../../api';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [stories, setStories] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.listRecipes().then((r) => { if (!cancelled) setRecipes(r); }).catch((e) => console.error(e));
    api.listStories().then((s) => { if (!cancelled) setStories(s); }).catch((e) => console.error(e));
    return () => { cancelled = true; };
  }, []);

  const filteredRecipes = recipes.filter(r => r.title.toLowerCase().includes(q.toLowerCase()) || (r.author || '').toLowerCase().includes(q.toLowerCase()));
  const filteredStories = stories.filter(s => s.title.toLowerCase().includes(q.toLowerCase()) || (s.author || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell active="search">
      <div className="px-8 py-6">
        <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Search your jar</h1>
        <p className="text-neutral-500 text-[14px] mt-1">Find recipes, stories and family members instantly.</p>

        <div className="mt-6 max-w-2xl relative">
          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Try ‘sambar’, ‘Paati’ or ‘Diwali’" className="w-full bg-white border border-neutral-200 rounded-xl pl-12 pr-4 py-3.5 text-[15px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" />
        </div>

        {q && (
          <div className="mt-8 space-y-8">
            <div>
              <h2 className="font-semibold text-neutral-900 mb-3">Recipes ({filteredRecipes.length})</h2>
              {filteredRecipes.length === 0 ? <p className="text-neutral-500 text-[14px]">No matches</p> : (
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredRecipes.map(r => (
                    <div key={r.id} className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-4">
                      {r.cover && <img src={r.cover} alt={r.title} className="w-14 h-14 rounded-lg object-cover" />}
                      <div>
                        <p className="font-semibold text-[14.5px]">{r.title}</p>
                        <p className="text-[12px] text-neutral-500">By {r.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900 mb-3">Stories ({filteredStories.length})</h2>
              {filteredStories.length === 0 ? <p className="text-neutral-500 text-[14px]">No matches</p> : (
                <div className="space-y-3">
                  {filteredStories.map(s => (
                    <div key={s.id} className="bg-white rounded-xl border border-neutral-200 p-4">
                      <p className="font-semibold text-[14.5px]">{s.title}</p>
                      <p className="text-[12px] text-neutral-500">By {s.author}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!q && (
          <div className="mt-8">
            <p className="text-[13px] font-semibold tracking-[0.15em] text-neutral-500 mb-3">RECENT SEARCHES</p>
            <div className="flex flex-wrap gap-2">
              {['Sambar', 'Paati\u2019s recipes', 'Diwali sweets', 'Rajma', 'Kitchen wisdom'].map(t => (
                <button key={t} onClick={() => setQ(t)} className="text-[13px] bg-white border border-neutral-200 rounded-full px-4 py-1.5 hover:border-cumin-green transition-colors">{t}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
