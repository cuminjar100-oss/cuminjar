import React from 'react';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { Link } from 'react-router-dom';
import { UserPlus, Mic, Sparkles, Heart, ArrowRight, CheckCircle2 } from 'lucide-react';

const steps = [
  { n: 1, icon: UserPlus, title: 'Create Your Family Space', desc: 'Sign up and set up a private family group. Add your family’s story, choose your primary language, and add a cover photo.', tint: 'bg-[#E4DEF4]', ic: 'text-[#7A6FB0]' },
  { n: 2, icon: Mic, title: 'Record & Share Voice Memories', desc: 'Elders record recipes and stories in their own voice using the app. No typing needed — just talk naturally.', tint: 'bg-[#FBE3D2]', ic: 'text-terracotta' },
  { n: 3, icon: Sparkles, title: 'AI Works Its Magic', desc: 'Our AI transcribes, structures ingredients, steps and timings into beautifully formatted recipe cards. Translation is available if needed.', tint: 'bg-[#DFEAD8]', ic: 'text-[#5D7A4E]' },
  { n: 4, icon: Heart, title: 'Preserve & Cherish Forever', desc: 'Add photos, notes and stories. Invite family. Pass down your heritage to the next generation — in their voice.', tint: 'bg-[#F7D9DA]', ic: 'text-[#C25264]' }
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-cream">
      <MarketingHeader />
      <section className="max-w-6xl mx-auto px-6 lg:px-10 pt-14 pb-8 text-center">
        <span className="inline-block bg-[#F7DFCE] text-terracotta text-[11px] font-semibold tracking-[0.18em] px-4 py-2 rounded-full">HOW IT WORKS</span>
        <h1 className="font-serif-display text-[46px] md:text-[56px] font-semibold mt-6 leading-[1.05] max-w-3xl mx-auto">
          From voice to <span className="text-terracotta italic">legacy</span>, in four simple steps.
        </h1>
        <p className="mt-6 text-[17px] text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          CuminJar turns your family’s spoken memories into structured, searchable and shareable keepsakes — without the fuss.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 lg:px-10 py-12 space-y-16">
        {steps.map((s, idx) => (
          <div key={s.n} className={`grid md:grid-cols-2 gap-10 items-center ${idx % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
            <div className={`${idx % 2 === 1 ? 'md:order-2' : ''}`}>
              <p className="text-terracotta font-semibold text-[13px] tracking-[0.18em]">STEP {String(s.n).padStart(2, '0')}</p>
              <h2 className="font-serif-display text-[32px] md:text-[36px] font-semibold mt-2 text-neutral-900">{s.title}</h2>
              <p className="mt-4 text-neutral-600 text-[15.5px] leading-relaxed">{s.desc}</p>
              <ul className="mt-5 space-y-2 text-[14px] text-neutral-700">
                {['Simple to use', 'Private & secure', 'Works in your language'].map(x => (
                  <li key={x} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-cumin-green" /> {x}</li>
                ))}
              </ul>
            </div>
            <div className={`${idx % 2 === 1 ? 'md:order-1' : ''}`}>
              <div className={`aspect-[4/3] rounded-3xl ${s.tint} flex items-center justify-center`}>
                <s.icon size={80} className={s.ic} strokeWidth={1.4} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="max-w-5xl mx-auto px-6 lg:px-10 py-16">
        <div className="bg-white rounded-3xl border border-neutral-200/70 p-10 text-center">
          <h2 className="font-serif-display text-[36px] font-semibold text-neutral-900">Ready to preserve your family’s story?</h2>
          <p className="mt-4 text-neutral-600">Start free. Invite your loved ones. Record forever memories.</p>
          <Link to="/get-started" className="mt-6 inline-flex items-center gap-2 bg-cumin-green text-white font-medium px-6 py-3.5 rounded-lg hover:bg-[#324A2F] transition-all shadow-sm hover:shadow-md">
            Start Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
