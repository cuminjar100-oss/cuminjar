import React from 'react';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { heroImages } from '../mock';
import { Heart, Award, Users, Globe } from 'lucide-react';

const stats = [
  { icon: Users, k: '1,000+', v: 'Families onboarded' },
  { icon: Heart, k: '8,500+', v: 'Voice recipes saved' },
  { icon: Globe, k: '12', v: 'Languages supported' },
  { icon: Award, k: '4.9', v: 'Average family rating' }
];

export default function About() {
  return (
    <div className="min-h-screen bg-cream">
      <MarketingHeader />
      <section className="max-w-6xl mx-auto px-6 lg:px-10 pt-14 pb-8 text-center">
        <span className="inline-block bg-[#F7DFCE] text-terracotta text-[11px] font-semibold tracking-[0.18em] px-4 py-2 rounded-full">OUR STORY</span>
        <h1 className="font-serif-display text-[46px] md:text-[56px] font-semibold mt-6 leading-[1.05] max-w-3xl mx-auto">Every family has a jar of <span className="text-terracotta italic">memories</span>. We help you keep it full.</h1>
      </section>

      <section className="max-w-5xl mx-auto px-6 lg:px-10 py-6 grid md:grid-cols-2 gap-10 items-center">
        <img src={heroImages.claypotFrame} alt="family jar" className="rounded-3xl w-full h-[380px] object-cover" />
        <div>
          <h2 className="font-serif-display text-[32px] font-semibold text-neutral-900">Why we built CuminJar</h2>
          <p className="mt-4 text-neutral-700 text-[15.5px] leading-relaxed">
            When our grandmother passed away, we realized her recipes lived only in her hands, her voice and her memory. Nothing was written down. Nothing was saved. We built CuminJar so no other family has to lose their traditions the way we almost did.
          </p>
          <p className="mt-4 text-neutral-700 text-[15.5px] leading-relaxed">
            Today, CuminJar is a home for family recipes, stories and rituals — in the voice of the people who lived them.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-14 grid md:grid-cols-4 gap-6">
        {stats.map(s => (
          <div key={s.v} className="bg-white rounded-2xl border border-neutral-200/70 p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#F5EDDD] flex items-center justify-center">
              <s.icon size={20} className="text-terracotta" />
            </div>
            <p className="font-serif-display text-[32px] font-semibold mt-3 text-neutral-900">{s.k}</p>
            <p className="text-[13.5px] text-neutral-500">{s.v}</p>
          </div>
        ))}
      </section>

      <section className="max-w-4xl mx-auto px-6 lg:px-10 py-10 text-center">
        <h2 className="font-serif-display text-[32px] font-semibold text-neutral-900">Our promise</h2>
        <p className="mt-4 text-neutral-700 leading-relaxed text-[15.5px]">Your family’s stories belong to your family. We will never sell your data, share your recordings, or use them to train third-party models. CuminJar is a private, secure space — forever.</p>
      </section>
      <MarketingFooter />
    </div>
  );
}
