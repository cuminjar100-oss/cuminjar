import React from 'react';
import { Link } from 'react-router-dom';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { Heart, MapPin, Sparkles } from 'lucide-react';

const featured = {
  image: '/stories/paati-recipes.jpg',
  location: 'Chennai, India',
  who: 'Lakshmi Paati, 74',
  title: 'Every Sunday, Paati records one recipe.',
  body:
    "For years, Lakshmi Paati's family begged her to write down her recipes. She couldn't — arthritis made pens too heavy. Then her granddaughter set up CuminJar on her phone. Now, every Sunday morning after her coffee, Paati taps Record and simply talks. Sambar, aviyal, morkuzhambu — 47 recipes and counting, all in her own voice, ready for her granddaughters to cook when they miss home.",
};

const stories = [
  {
    id: 's1',
    image: '/stories/mother-daughter-boston.jpg',
    location: 'Bengaluru → Boston',
    who: 'Meera, mother of Priya',
    title: 'Sending idli batter across oceans.',
    body:
      'Priya moved to Boston for grad school and missed her mother\'s idli. Meera now records the batter ratios, the resting time, and the little Kannada whispers of "wait, wait, let it puff up" — Priya presses play in her tiny Cambridge kitchen and cooks along. Sunday breakfast, seven thousand miles apart.',
  },
  {
    id: 's2',
    image: '/stories/mother-son-sydney.jpg',
    location: 'Mumbai → Sydney',
    who: 'Kavitha, Ammamma to twins',
    title: 'Nani\'s bedtime stories, on demand.',
    body:
      'Kavitha\'s twin grandchildren live in Sydney. Once a week she opens CuminJar and records a story from her own childhood — the mango tree, the temple bells, the time thatha lost a slipper on the train. The twins fall asleep to Nani\'s voice at 8pm Australian time. A little bit of Mumbai, in every bedroom.',
  },
  {
    id: 's3',
    image: '/stories/paati-story-time.jpg',
    location: 'Kerala',
    who: 'Raghavan Thatha, 78',
    title: 'A whole childhood, saved forever.',
    body:
      'Raghavan Thatha grew up in a village near Palakkad. His grandchildren asked him for stories at Onam. He forgot them by Christmas. Now his son records every conversation on the verandah — the school he walked to, the elephant that came to the wedding, the recipe for banana chips. His grandchildren will have him always.',
  },
];

const stats = [
  { n: '1,240+', l: 'families around the world' },
  { n: '18', l: 'countries' },
  { n: '12', l: 'languages' },
  { n: '9,800+', l: 'recipes preserved' },
];

export default function Stories() {
  return (
    <div className="min-h-screen bg-cream">
      <MarketingHeader />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 lg:px-10 pt-14 pb-8 text-center">
        <span className="inline-block bg-[#F7DFCE] text-terracotta text-[11px] font-semibold tracking-[0.18em] px-4 py-2 rounded-full">FAMILY STORIES</span>
        <h1 className="font-serif-display text-[46px] md:text-[56px] font-semibold mt-6 leading-[1.05]">
          Real families. Real <span className="text-terracotta italic">voices</span>. Kept forever.
        </h1>
        <p className="mt-6 text-[17px] text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          A quiet corner of the internet where grandmothers become storytellers, mothers become teachers,
          and every recipe carries a fingerprint of who came before.
        </p>
      </section>

      {/* Featured story */}
      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-6">
        <div className="bg-white rounded-3xl border border-neutral-200/70 overflow-hidden grid md:grid-cols-2 gap-0">
          <div className="relative aspect-[4/3] md:aspect-auto">
            <img src={featured.image} alt={featured.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[12px] text-neutral-800">
              <MapPin size={12} className="text-terracotta" /> {featured.location}
            </div>
          </div>
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <span className="text-terracotta text-[12px] font-semibold tracking-[0.18em]">FEATURED STORY</span>
            <h2 className="font-serif-display text-[30px] md:text-[36px] font-semibold mt-3 text-neutral-900 leading-tight">{featured.title}</h2>
            <p className="mt-4 text-neutral-700 text-[15px] leading-relaxed">{featured.body}</p>
            <p className="mt-5 text-[13px] text-neutral-500 italic">— {featured.who}</p>
          </div>
        </div>
      </section>

      {/* Story grid */}
      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-12">
        <h3 className="font-serif-display text-[28px] font-semibold text-neutral-900 mb-2">Ways families use CuminJar</h3>
        <p className="text-neutral-600 text-[14.5px] mb-8">Little rituals. Distances softened. Voices preserved.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {stories.map(s => (
            <article key={s.id} className="bg-white rounded-2xl border border-neutral-200/70 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[11px] text-neutral-800">
                  <MapPin size={11} className="text-terracotta" /> {s.location}
                </div>
              </div>
              <div className="p-6">
                <h4 className="font-serif-display text-[20px] font-semibold text-neutral-900 leading-tight">{s.title}</h4>
                <p className="mt-3 text-[13.5px] text-neutral-700 leading-relaxed">{s.body}</p>
                <p className="mt-4 text-[12px] text-neutral-500 italic">— {s.who}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Community stats */}
      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
        <div className="bg-white rounded-3xl border border-neutral-200/70 p-8 md:p-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(s => (
            <div key={s.l}>
              <p className="font-serif-display text-[36px] font-semibold text-cumin-green">{s.n}</p>
              <p className="mt-1 text-[12.5px] uppercase tracking-wider text-neutral-500">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 lg:px-10 py-16 text-center">
        <Sparkles size={22} className="mx-auto text-terracotta" />
        <h3 className="mt-4 font-serif-display text-[30px] md:text-[36px] font-semibold text-neutral-900 leading-tight">
          Your family has stories too.
        </h3>
        <p className="mt-3 text-neutral-600 text-[15px] leading-relaxed">
          Start with one recipe. One memory. One festival. In a decade, your grandchildren will thank you.
        </p>
        <Link to="/get-started" className="inline-flex items-center gap-2 mt-6 bg-cumin-green text-white px-6 py-3 rounded-lg font-medium hover:bg-[#324A2F] transition-colors">
          <Heart size={15} /> Start your family jar free
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}
