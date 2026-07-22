import React from 'react';
import AppShell from '../../components/AppShell';
import { Users, Mic, Sparkles, Heart } from 'lucide-react';

const notifs = [
  { icon: Mic, title: 'Lakshmi Paati added a new voice recipe', desc: '“Paati’s Sambar” is ready to listen.', when: '2h ago', tint: 'bg-[#FBE3D2]', ic: 'text-terracotta' },
  { icon: Sparkles, title: 'AI transcription complete', desc: 'Your recording “Kitchen Wisdom” has been transcribed.', when: '5h ago', tint: 'bg-[#DFEAD8]', ic: 'text-[#5D7A4E]' },
  { icon: Users, title: 'Arjun R. joined your family group', desc: 'Welcome him with a recipe or a story.', when: 'Yesterday', tint: 'bg-[#E4DEF4]', ic: 'text-[#7A6FB0]' },
  { icon: Heart, title: 'Priya S. loved your recipe', desc: '“Rajma Chawal” received a heart.', when: '2 days ago', tint: 'bg-[#F7D9DA]', ic: 'text-[#C25264]' }
];

export default function NotificationsPage() {
  return (
    <AppShell active="">
      <div className="px-8 py-6 max-w-3xl">
        <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Notifications</h1>
        <p className="text-neutral-500 text-[14px] mt-1">Everything happening in your family jar.</p>

        <div className="mt-8 space-y-3">
          {notifs.map((n, i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-200/70 p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-full ${n.tint} flex items-center justify-center flex-shrink-0`}>
                <n.icon size={18} className={n.ic} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[14.5px] text-neutral-900">{n.title}</p>
                <p className="text-[13px] text-neutral-600 mt-0.5">{n.desc}</p>
              </div>
              <span className="text-[12px] text-neutral-400 flex-shrink-0">{n.when}</span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
