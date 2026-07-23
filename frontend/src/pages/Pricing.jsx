import React from 'react';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Family Free',
    price: '₹0',
    cadence: '/ forever',
    desc: 'Start preserving. Try CuminJar with your family.',
    features: ['1 family group', '1 family member', 'Up to 3 recipes', '2 GB storage', 'Basic AI transcription', 'Community support'],
    cta: 'Start Free',
    highlighted: false
  },
  {
    name: 'Family Plus',
    price: '₹299',
    cadence: '/ month',
    desc: 'Grow your jar. Unlock the full experience.',
    features: ['Unlimited family groups', 'Unlimited family members', 'Unlimited voice recipes', '50 GB storage', 'Advanced AI + translation', 'Family Tree', 'Priority support'],
    cta: 'Start 14-day trial',
    highlighted: true
  },
  {
    name: 'Family Legacy',
    price: '₹2,999',
    cadence: '/ year',
    desc: 'Preserve forever. Best value for large families.',
    features: ['Everything in Plus', 'Unlimited family groups', 'Unlimited family members', '200 GB storage', 'Concierge onboarding', 'Print-ready cookbook export', 'Yearly heritage backup'],
    cta: 'Talk to us',
    highlighted: false
  }
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-cream">
      <MarketingHeader />
      <section className="max-w-6xl mx-auto px-6 lg:px-10 pt-14 pb-8 text-center">
        <span className="inline-block bg-[#F7DFCE] text-terracotta text-[11px] font-semibold tracking-[0.18em] px-4 py-2 rounded-full">SIMPLE PRICING</span>
        <h1 className="font-serif-display text-[46px] md:text-[56px] font-semibold mt-6 leading-[1.05]">A plan for every <span className="text-terracotta italic">family</span>.</h1>
        <p className="mt-6 text-[17px] text-neutral-600 max-w-2xl mx-auto leading-relaxed">Start free. Upgrade when you want more space for your memories.</p>
      </section>

      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-10 grid md:grid-cols-3 gap-6">
        {plans.map(p => (
          <div
            key={p.name}
            className={`rounded-3xl p-8 border transition-all ${p.highlighted
              ? 'bg-white border-cumin-green shadow-xl -translate-y-2'
              : 'bg-white border-neutral-200/70 hover:shadow-md'}`}
          >
            {p.highlighted && (
              <span className="inline-block bg-cumin-green text-white text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full mb-3">MOST LOVED</span>
            )}
            <h3 className="font-serif-display text-[26px] font-semibold text-neutral-900">{p.name}</h3>
            <p className="text-[13.5px] text-neutral-500 mt-1">{p.desc}</p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-serif-display text-[44px] font-semibold text-neutral-900">{p.price}</span>
              <span className="text-neutral-500 text-[14px]">{p.cadence}</span>
            </div>
            <Link
              to="/get-started"
              className={`mt-6 block text-center font-medium py-3 rounded-lg transition-all ${p.highlighted
                ? 'bg-cumin-green text-white hover:bg-[#324A2F]'
                : 'bg-[#F5EDDD] text-neutral-900 hover:bg-[#EFE3CB]'}`}
            >
              {p.cta}
            </Link>
            <ul className="mt-6 space-y-3">
              {p.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-[14px] text-neutral-700">
                  <Check size={16} className="text-cumin-green mt-0.5" /> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="max-w-3xl mx-auto px-6 lg:px-10 py-14 text-center">
        <p className="text-neutral-600 text-[15px]">All plans include end-to-end encryption, cloud backup and native mobile apps. Cancel anytime.</p>
      </section>
      <MarketingFooter />
    </div>
  );
}
