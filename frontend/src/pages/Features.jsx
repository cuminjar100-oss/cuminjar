import React from 'react';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { Mic, Sparkles, ImagePlus, Users, Globe, Lock, Search, Book, HeartHandshake, PenTool, Bell, Cloud } from 'lucide-react';

const list = [
  { icon: Mic, title: 'Voice Recording', desc: 'Record recipes and stories directly in the app. Pause, resume, edit chapters.', tint: 'bg-[#FBE3D2]', ic: 'text-terracotta' },
  { icon: Sparkles, title: 'AI Transcription', desc: 'Voice becomes text automatically — accurate, punctuated, and formatted.', tint: 'bg-[#DFEAD8]', ic: 'text-[#5D7A4E]' },
  { icon: Globe, title: 'Multi-lingual Support', desc: 'Record in Hindi, Tamil, Telugu, Marathi & more. Auto-translate to English.', tint: 'bg-[#E4DEF4]', ic: 'text-[#7A6FB0]' },
  { icon: ImagePlus, title: 'Photos & Notes', desc: 'Add cover photos, in-step photos, notes and family anecdotes.', tint: 'bg-[#F9E4C3]', ic: 'text-[#B08238]' },
  { icon: Users, title: 'Family Sharing', desc: 'Invite parents, siblings, cousins. Everyone sees the same jar.', tint: 'bg-[#F7D9DA]', ic: 'text-[#C25264]' },
  { icon: Book, title: 'Recipe Cards', desc: 'Beautifully formatted with ingredients, steps, timings & servings.', tint: 'bg-[#FBE3D2]', ic: 'text-terracotta' },
  { icon: PenTool, title: 'Handwritten Recipes', desc: 'Scan your grandmother’s handwritten notes. We’ll digitize them.', tint: 'bg-[#DFEAD8]', ic: 'text-[#5D7A4E]' },
  { icon: Search, title: 'Instant Search', desc: 'Find any recipe or story across your family jar in seconds.', tint: 'bg-[#E4DEF4]', ic: 'text-[#7A6FB0]' },
  { icon: HeartHandshake, title: 'Family Tree', desc: 'Attach recipes to relatives. See your legacy visually.', tint: 'bg-[#F7D9DA]', ic: 'text-[#C25264]' },
  { icon: Bell, title: 'Memory Reminders', desc: 'Gentle nudges to record stories on birthdays and festivals.', tint: 'bg-[#F9E4C3]', ic: 'text-[#B08238]' },
  { icon: Lock, title: 'Private & Secure', desc: 'End-to-end encrypted. Only your family sees your family jar.', tint: 'bg-[#DFEAD8]', ic: 'text-[#5D7A4E]' },
  { icon: Cloud, title: 'Cloud Backup', desc: 'Everything auto-backed up. Your legacy stays safe, always.', tint: 'bg-[#FBE3D2]', ic: 'text-terracotta' }
];

export default function Features() {
  return (
    <div className="min-h-screen bg-cream">
      <MarketingHeader />
      <section className="max-w-6xl mx-auto px-6 lg:px-10 pt-14 pb-6 text-center">
        <span className="inline-block bg-[#F7DFCE] text-terracotta text-[11px] font-semibold tracking-[0.18em] px-4 py-2 rounded-full">EVERYTHING YOU NEED</span>
        <h1 className="font-serif-display text-[46px] md:text-[56px] font-semibold mt-6 leading-[1.05]">Features built for <span className="text-terracotta italic">families</span>.</h1>
        <p className="mt-6 text-[17px] text-neutral-600 max-w-2xl mx-auto leading-relaxed">Everything you need to record, organize and treasure your family’s recipes and stories.</p>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map(f => (
          <div key={f.title} className="bg-white border border-neutral-200/70 rounded-2xl p-6 hover:shadow-lg transition-shadow duration-300">
            <div className={`w-12 h-12 rounded-xl ${f.tint} flex items-center justify-center`}>
              <f.icon size={22} className={f.ic} />
            </div>
            <h3 className="mt-4 font-semibold text-[17px] text-neutral-900">{f.title}</h3>
            <p className="mt-1.5 text-[14px] text-neutral-600 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      <MarketingFooter />
    </div>
  );
}
