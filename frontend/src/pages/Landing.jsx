import React from 'react';
import { Link } from 'react-router-dom';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { Play, Mic, Sparkles, ImagePlus, Users, UserPlus, Heart, Star, ArrowRight } from 'lucide-react';
import { features, steps, testimonials, pressLogos, heroImages, familyAvatars } from '../mock';
import { StarAnise, Cardamom, CinnamonStick, LeafSprig } from '../components/Spices';

const iconMap = { Mic, Sparkles, ImagePlus, Users, UserPlus, Heart };

const tintBg = {
  peach: 'bg-[#FBE3D2]', sage: 'bg-[#DFEAD8]', amber: 'bg-[#F9E4C3]', lavender: 'bg-[#E4DEF4]', blush: 'bg-[#F7D9DA]'
};
const tintIcon = {
  peach: 'text-[#C46B4A]', sage: 'text-[#5D7A4E]', amber: 'text-[#B08238]', lavender: 'text-[#7A6FB0]', blush: 'text-[#C25264]'
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream">
      <MarketingHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-10 lg:pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <span className="inline-block bg-[#F7DFCE] text-terracotta text-[11px] font-semibold tracking-[0.18em] px-4 py-2 rounded-full">
              PRESERVE. SHARE. TREASURE.
            </span>
            <h1 className="font-serif-display text-[46px] md:text-[62px] leading-[1.05] font-semibold mt-6 text-neutral-900">
              Preserve family recipes,<br />
              stories &amp; traditions<br />
              <span className="text-terracotta italic font-medium">in their voice.</span>
            </h1>
            <p className="mt-6 text-[17px] text-neutral-600 leading-relaxed max-w-lg">
              Record your loved ones. We turn their voice recipes and stories into beautiful keepsakes that live on for generations.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 bg-cumin-green text-white text-[15px] font-medium px-6 py-3.5 rounded-lg hover:bg-[#324A2F] transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5"
              >
                Start Your Family Account
              </Link>
              <button className="inline-flex items-center gap-2 text-neutral-800 text-[15px] font-medium hover:text-cumin-green transition-colors">
                <span className="w-9 h-9 rounded-full border border-neutral-300 flex items-center justify-center bg-white shadow-sm">
                  <Play size={14} className="ml-0.5" fill="currentColor" />
                </span>
                Watch how it works
              </button>
            </div>
            <div className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-2">
                {familyAvatars.slice(0, 4).map((src, i) => (
                  <img key={i} src={src} alt="family member" className="w-9 h-9 rounded-full border-2 border-cream object-cover" />
                ))}
              </div>
              <p className="text-[14px] text-neutral-600">Join 1,000+ families preserving their heritage</p>
            </div>
          </div>

          {/* Phone mockup + spice decorations */}
          <div className="relative flex justify-center lg:justify-end min-h-[560px]">
            <div className="absolute -top-6 -right-6 w-48 h-48 rounded-full bg-[#EEE9DA] opacity-60 blur-2xl" />
            <div className="relative">
              <PhoneMockup image={heroImages.grandmaKitchen} />
              {/* handwritten recipe journal */}
              <img
                src={heroImages.recipeJournal}
                alt="recipe journal"
                className="absolute -right-10 top-16 w-40 h-64 object-cover rounded-md shadow-xl rotate-6 hidden md:block"
              />

              {/* Spice decorations scattered around the phone base */}
              <StarAnise size={78} className="absolute -left-14 bottom-24 drop-shadow-md hidden md:block" style={{ transform: 'rotate(-12deg)' }} />
              <StarAnise size={42} className="absolute left-2 -bottom-2 drop-shadow-sm hidden md:block" style={{ transform: 'rotate(24deg)' }} />

              <Cardamom size={22} className="absolute -left-4 bottom-6 hidden md:block" rotate={-20} />
              <Cardamom size={20} className="absolute left-8 bottom-16 hidden md:block" rotate={15} />
              <Cardamom size={18} className="absolute left-16 bottom-2 hidden md:block" rotate={-10} />
              <Cardamom size={20} className="absolute -left-8 bottom-40 hidden md:block" rotate={40} />
              <Cardamom size={22} className="absolute left-24 bottom-10 hidden md:block" rotate={-5} />
              <Cardamom size={18} className="absolute -left-16 bottom-8 hidden md:block" rotate={20} />
              <Cardamom size={20} className="absolute left-32 -bottom-2 hidden md:block" rotate={35} />
              <Cardamom size={18} className="absolute left-4 bottom-32 hidden md:block" rotate={-25} />

              <CinnamonStick size={30} className="absolute -left-12 bottom-8 hidden md:block" rotate={-18} />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES STRIP */}
      <section className="bg-cream-warm py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid md:grid-cols-4 gap-8">
          {features.map(f => {
            const Icon = iconMap[f.icon];
            return (
              <div key={f.id} className="text-center group">
                <div className={`w-16 h-16 mx-auto rounded-full ${tintBg[f.color]} flex items-center justify-center mb-4 transition-transform group-hover:-translate-y-1`}>
                  <Icon className={tintIcon[f.color]} size={26} strokeWidth={2} />
                </div>
                <h3 className="font-semibold text-neutral-900 text-[16px] mb-2">{f.title}</h3>
                <p className="text-[14px] text-neutral-600 leading-relaxed max-w-[240px] mx-auto">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 text-center">
          <p className="text-terracotta text-[11px] font-semibold tracking-[0.22em] mb-3">HOW IT WORKS</p>
          <h2 className="font-serif-display text-[38px] md:text-[46px] font-semibold text-neutral-900">Simple. Personal. Timeless.</h2>

          <div className="mt-16 grid md:grid-cols-4 gap-6 relative">
            {steps.map((s, idx) => {
              const Icon = iconMap[s.icon];
              return (
                <div key={s.n} className="relative flex flex-col items-center">
                  <div className="absolute -top-1 flex items-center justify-center w-7 h-7 rounded-full bg-white border border-neutral-200 text-terracotta text-[13px] font-semibold z-10">
                    {s.n}
                  </div>
                  <div className={`w-24 h-24 rounded-full ${tintBg[s.tint]} flex items-center justify-center mt-3 mb-4`}>
                    <Icon className={tintIcon[s.tint]} size={30} strokeWidth={1.8} />
                  </div>
                  <h4 className="font-semibold text-neutral-900 mb-2">{s.title}</h4>
                  <p className="text-[14px] text-neutral-600 leading-relaxed max-w-[220px]">{s.desc}</p>
                  {idx < steps.length - 1 && (
                    <ArrowRight className="hidden md:block absolute top-14 -right-3 text-neutral-300" size={18} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 bg-cream-warm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 text-center">
          <p className="text-terracotta text-[11px] font-semibold tracking-[0.22em] mb-3">LOVED BY FAMILIES</p>
          <h2 className="font-serif-display text-[36px] md:text-[42px] font-semibold text-neutral-900">What families are saying</h2>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.id} className="bg-white rounded-2xl p-6 border border-neutral-200/70 text-left hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <img src={t.avatar} alt={t.name} className="w-11 h-11 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-neutral-900 text-[15px]">{t.name}</p>
                    <p className="text-[12px] text-neutral-500">{t.location}</p>
                  </div>
                </div>
                <p className="text-[14.5px] text-neutral-700 leading-relaxed">“{t.quote}”</p>
                <div className="flex items-center gap-1 mt-4">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-[#E2A73D] fill-[#E2A73D]" />)}
                  <span className="text-[12px] text-neutral-500 ml-2">Verified Family</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRESS */}
      <section className="py-16 bg-cream">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 text-center">
          <p className="text-terracotta text-[11px] font-semibold tracking-[0.22em] mb-8">TRUSTED BY FAMILIES</p>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-14 opacity-60">
            {pressLogos.map(l => (
              <span key={l} className="text-[18px] md:text-[22px] font-serif-display font-semibold text-neutral-500 tracking-tight">{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="bg-gradient-to-br from-[#F5EBDA] to-[#F7DFCE] rounded-3xl p-10 md:p-14 text-center border border-neutral-200/70 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/40 blur-2xl" />
            <h2 className="font-serif-display text-[36px] md:text-[46px] font-semibold text-neutral-900 relative">
              Start your family jar today.
            </h2>
            <p className="mt-4 text-neutral-700 text-[16px] max-w-xl mx-auto relative">
              Record their voice. Save their stories. Pass down the flavors of your family — forever.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4 relative">
              <Link to="/get-started" className="bg-cumin-green text-white font-medium px-7 py-3.5 rounded-lg hover:bg-[#324A2F] transition-all shadow-sm hover:shadow-lg">
                Get Started Free
              </Link>
              <Link to="/how-it-works" className="bg-white text-neutral-800 font-medium px-7 py-3.5 rounded-lg border border-neutral-200 hover:border-cumin-green transition-colors">
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function PhoneMockup({ image }) {
  return (
    <div className="relative w-[300px] md:w-[340px] bg-neutral-900 rounded-[42px] p-2 shadow-2xl">
      <div className="bg-neutral-900 rounded-[36px] overflow-hidden relative" style={{ aspectRatio: '9/19.5' }}>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-neutral-900 rounded-full z-20" />
        <div className="bg-cream h-full overflow-hidden relative">
          {/* Status bar */}
          <div className="flex justify-between items-center px-6 pt-3 text-[11px] font-semibold">
            <span>9:41</span>
            <span className="opacity-70">•••</span>
          </div>
          {/* Header */}
          <div className="flex justify-between items-center px-4 pt-4 pb-3">
            <span className="text-[18px]">☰</span>
            <span className="font-semibold text-[15px]">Family Recipes</span>
            <span className="text-[16px]">🔔</span>
          </div>
          {/* Image with play */}
          <div className="relative mx-3 rounded-xl overflow-hidden">
            <img src={image} alt="grandma" className="w-full h-44 object-cover" style={{ objectPosition: '50% 25%' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <Play className="text-neutral-900 ml-0.5" size={22} fill="currentColor" />
              </div>
            </div>
            {/* audio waveform */}
            <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2 text-white text-[10px]">
              <span>0:00</span>
              <div className="flex-1 h-6 flex items-center gap-[2px]">
                {[...Array(30)].map((_, i) => (
                  <div key={i} className="bg-white/80 rounded-full w-[2px]" style={{ height: `${6 + Math.sin(i / 2) * 8 + Math.random() * 6}px` }} />
                ))}
              </div>
              <span>2:45</span>
            </div>
          </div>
          {/* Recipe details */}
          <div className="px-4 mt-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-display font-semibold text-[18px]">Paati’s Sambar</h3>
              <Heart size={16} className="text-terracotta" />
            </div>
            <p className="text-[12px] text-neutral-500 mt-0.5">By Lakshmi Paati</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-[11px] bg-neutral-100 px-2.5 py-1 rounded-full">Serves 4–5</span>
              <span className="text-[11px] bg-neutral-100 px-2.5 py-1 rounded-full">45 mins</span>
              <span className="text-[11px] bg-neutral-100 px-2.5 py-1 rounded-full">South Indian</span>
            </div>
            <div className="mt-3 flex gap-4 border-b border-neutral-200 pb-2 text-[12px]">
              <span className="font-semibold text-cumin-green border-b-2 border-cumin-green pb-1">Ingredients</span>
              <span className="text-neutral-500">Steps</span>
              <span className="text-neutral-500">Notes</span>
              <span className="text-neutral-500">Stories</span>
            </div>
            <ul className="mt-3 text-[12px] text-neutral-700 space-y-1.5">
              <li>• Toor dal – 1 cup</li>
              <li>• Tamarind – small lemon size</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
