import React from 'react';
import AppShell from '../../components/AppShell';
import { familyAvatars } from '../../mock';
import { Plus } from 'lucide-react';

const tree = [
  { level: 0, members: [{ name: 'Ramanathan Thatha', role: 'Grandfather', avatar: familyAvatars[0] }, { name: 'Lakshmi Paati', role: 'Grandmother', avatar: familyAvatars[2] }] },
  { level: 1, members: [{ name: 'Suresh Rao', role: 'Father', avatar: familyAvatars[1] }, { name: 'Kavita Rao', role: 'Mother', avatar: familyAvatars[3] }] },
  { level: 2, members: [{ name: 'Meera R.', role: 'You', avatar: familyAvatars[2] }, { name: 'Arjun R.', role: 'Brother', avatar: familyAvatars[1] }] }
];

export default function FamilyTreePage() {
  return (
    <AppShell active="tree">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Family Tree</h1>
            <p className="text-neutral-500 text-[14px] mt-1">See your family’s legacy, generation by generation.</p>
          </div>
          <button className="flex items-center gap-2 bg-cumin-green text-white px-4 py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#324A2F] transition-colors"><Plus size={15} /> Add Member</button>
        </div>

        <div className="mt-10 bg-[#FBF6EE] rounded-3xl border border-neutral-200/70 p-10">
          <div className="space-y-14">
            {tree.map((row, ri) => (
              <div key={ri} className="relative">
                <div className="flex items-center justify-center gap-16 flex-wrap">
                  {row.members.map(m => (
                    <div key={m.name} className="flex flex-col items-center bg-white rounded-2xl border border-neutral-200/70 px-5 py-4 min-w-[180px]">
                      <img src={m.avatar} alt={m.name} className="w-16 h-16 rounded-full object-cover" />
                      <p className="font-semibold text-[14px] mt-3 text-neutral-900">{m.name}</p>
                      <p className="text-[12px] text-neutral-500">{m.role}</p>
                    </div>
                  ))}
                </div>
                {ri < tree.length - 1 && <div className="w-px h-10 bg-neutral-300 mx-auto mt-4" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
