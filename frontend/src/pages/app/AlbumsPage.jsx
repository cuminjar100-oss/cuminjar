import React from 'react';
import AppShell from '../../components/AppShell';
import { Plus, Images as ImagesIcon } from 'lucide-react';
import { heroImages, mockRecipes } from '../../mock';

const albums = [
  { title: 'Diwali 2024', count: 42, cover: heroImages.grandmaKitchen },
  { title: 'Paati\u2019s Kitchen', count: 28, cover: heroImages.spicesBowl },
  { title: 'Handwritten Recipes', count: 15, cover: heroImages.recipeJournal },
  { title: 'Family Portraits', count: 61, cover: heroImages.claypotFrame },
  { title: 'Weekend Cooking', count: 19, cover: mockRecipes[1].cover },
  { title: 'Festival Sweets', count: 33, cover: mockRecipes[2].cover }
];

export default function AlbumsPage() {
  return (
    <AppShell active="albums">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Albums</h1>
            <p className="text-neutral-500 text-[14px] mt-1">Your family’s memories, gathered in one place.</p>
          </div>
          <button className="flex items-center gap-2 bg-cumin-green text-white px-4 py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#324A2F] transition-colors"><Plus size={15} /> New Album</button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {albums.map(a => (
            <div key={a.title} className="bg-white rounded-2xl border border-neutral-200/70 overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={a.cover} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-serif-display text-[19px] font-semibold text-neutral-900">{a.title}</h3>
                  <p className="text-[12.5px] text-neutral-500 mt-0.5 flex items-center gap-1"><ImagesIcon size={12} /> {a.count} items</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
