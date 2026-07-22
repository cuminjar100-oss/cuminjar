import React from 'react';
import AppShell from '../../components/AppShell';
import { mockStories } from '../../mock';
import { Play, Clock, Plus } from 'lucide-react';

export default function StoriesPage() {
  return (
    <AppShell active="stories">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Family Stories</h1>
            <p className="text-neutral-500 text-[14px] mt-1">Voices from your family jar.</p>
          </div>
          <button className="flex items-center gap-2 bg-cumin-green text-white px-4 py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#324A2F] transition-colors"><Plus size={15} /> New Story</button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {mockStories.map(s => (
            <article key={s.id} className="bg-white rounded-2xl border border-neutral-200/70 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <button className="w-11 h-11 rounded-full bg-[#FBE3D2] flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform">
                  <Play size={14} className="text-terracotta ml-0.5" fill="currentColor" />
                </button>
                <div>
                  <h3 className="font-serif-display text-[22px] font-semibold text-neutral-900">{s.title}</h3>
                  <p className="text-[12px] text-neutral-500 mt-0.5">By {s.author}</p>
                  <p className="mt-3 text-[14px] text-neutral-700 leading-relaxed">{s.excerpt}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-[12px] text-neutral-500"><Clock size={12} /> {s.mins} min listen</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
