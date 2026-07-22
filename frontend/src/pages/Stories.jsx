import React from 'react';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { Play, Clock } from 'lucide-react';
import { mockStories, heroImages } from '../mock';

export default function Stories() {
  return (
    <div className="min-h-screen bg-cream">
      <MarketingHeader />
      <section className="max-w-6xl mx-auto px-6 lg:px-10 pt-14 pb-8 text-center">
        <span className="inline-block bg-[#F7DFCE] text-terracotta text-[11px] font-semibold tracking-[0.18em] px-4 py-2 rounded-full">FAMILY STORIES</span>
        <h1 className="font-serif-display text-[46px] md:text-[56px] font-semibold mt-6 leading-[1.05]">Voices that live <span className="text-terracotta italic">on</span>.</h1>
        <p className="mt-6 text-[17px] text-neutral-600 max-w-2xl mx-auto leading-relaxed">Stories our community has chosen to share — recipes, memories and rituals passed down from one generation to the next.</p>
      </section>

      {/* Featured */}
      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-6">
        <div className="bg-white rounded-3xl border border-neutral-200/70 overflow-hidden grid md:grid-cols-2 gap-0">
          <div className="relative aspect-[4/3] md:aspect-auto">
            <img src={heroImages.grandmaKitchen} alt="featured" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-16 h-16 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                <Play size={24} className="ml-1 text-neutral-900" fill="currentColor" />
              </button>
            </div>
          </div>
          <div className="p-8 md:p-10 flex flex-col justify-center">
            <span className="text-terracotta text-[12px] font-semibold tracking-[0.18em]">FEATURED STORY</span>
            <h2 className="font-serif-display text-[32px] font-semibold mt-3 text-neutral-900">The Sambar That Traveled the World</h2>
            <p className="mt-3 text-neutral-600 text-[15px] leading-relaxed">Lakshmi Paati grew up in a small village near Tanjore. Today, her sambar recipe has crossed oceans — cooked in kitchens in Bengaluru, Boston and Berlin. Hear her tell it in her own voice.</p>
            <div className="mt-4 flex items-center gap-4 text-[13px] text-neutral-500">
              <span className="flex items-center gap-1"><Clock size={14} /> 8 min listen</span>
              <span>By Lakshmi Paati</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-12">
        <h3 className="font-serif-display text-[28px] font-semibold text-neutral-900 mb-6">More stories</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {mockStories.map(s => (
            <article key={s.id} className="bg-white rounded-2xl border border-neutral-200/70 p-6 hover:shadow-lg transition-shadow">
              <div className="w-10 h-10 rounded-full bg-[#FBE3D2] flex items-center justify-center mb-4">
                <Play size={14} className="text-terracotta ml-0.5" fill="currentColor" />
              </div>
              <h4 className="font-serif-display text-[22px] font-semibold text-neutral-900">{s.title}</h4>
              <p className="text-[12px] text-neutral-500 mt-1">By {s.author}</p>
              <p className="mt-3 text-[14px] text-neutral-700 leading-relaxed">{s.excerpt}</p>
              <div className="mt-4 flex items-center gap-1.5 text-[12px] text-neutral-500"><Clock size={12} /> {s.mins} min listen</div>
            </article>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
