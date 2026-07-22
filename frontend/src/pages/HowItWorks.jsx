import React from 'react';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { Link } from 'react-router-dom';
import { UserPlus, Mic, Sparkles, BookHeart, ArrowRight, CheckCircle2, QrCode, BookOpen, Volume2, Bookmark } from 'lucide-react';

const steps = [
  { n: 1, icon: UserPlus, title: 'Create Your Family Space', desc: 'Sign up and set up a private family group. Add your family’s story, choose your primary language, and add a cover photo.', tint: 'bg-[#E4DEF4]', ic: 'text-[#7A6FB0]' },
  { n: 2, icon: Mic, title: 'Record & Share Voice Memories', desc: 'Elders record recipes and stories in their own voice using the app. No typing needed — just talk naturally.', tint: 'bg-[#FBE3D2]', ic: 'text-terracotta' },
  { n: 3, icon: Sparkles, title: 'AI Works Its Magic', desc: 'Our AI transcribes, structures ingredients, steps and timings into beautifully formatted recipe cards. Translation is available if needed.', tint: 'bg-[#DFEAD8]', ic: 'text-[#5D7A4E]' },
  { n: 4, icon: BookHeart, title: 'Print & Preserve as a Hardbound Book', desc: 'Choose your favourite recipes and stories. We hardbind them into a beautiful heirloom book — with a QR code on every page. Scan any page to hear the recipe or story in your loved one’s voice. Read the book. Hear their voice. Preserve both, forever.', tint: 'bg-[#F7D9DA]', ic: 'text-[#C25264]', showBookVisual: true }
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
              {s.showBookVisual ? (
                <BookQrVisual tint={s.tint} />
              ) : (
                <div className={`aspect-[4/3] rounded-3xl ${s.tint} flex items-center justify-center`}>
                  <s.icon size={80} className={s.ic} strokeWidth={1.4} />
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Bonus feature spotlight for the book */}
      <section className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        <div className="bg-gradient-to-br from-[#F5EBDA] to-[#F7DFCE] rounded-3xl p-8 md:p-12 grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2">
            <span className="inline-block bg-white/70 text-terracotta text-[11px] font-semibold tracking-[0.18em] px-3 py-1.5 rounded-full">HEIRLOOM BOOK</span>
            <h2 className="font-serif-display text-[32px] md:text-[38px] font-semibold mt-3 text-neutral-900 leading-tight">Read the recipe. Scan the QR. Hear their voice.</h2>
            <p className="mt-4 text-neutral-700 text-[15.5px] leading-relaxed max-w-lg">Every page in your CuminJar hardbound book carries a unique QR code. Point your phone camera at it, and the exact recipe or story plays back in your loved one’s own voice — the way they told it to you.</p>
            <div className="mt-6 flex flex-wrap gap-6">
              <MiniPill icon={BookOpen} label="Hardbound heirloom" />
              <MiniPill icon={QrCode} label="QR on every page" />
              <MiniPill icon={Volume2} label="Voice preserved forever" />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <BookQrVisual tint="bg-white/60" compact />
          </div>
        </div>
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


function MiniPill({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 bg-white/70 backdrop-blur px-3 py-1.5 rounded-full">
      <Icon size={14} className="text-cumin-green" />
      <span className="text-[13px] text-neutral-800 font-medium">{label}</span>
    </div>
  );
}

// Visual: an open hardbound book with a recipe page + QR code
function BookQrVisual({ tint = 'bg-[#F7D9DA]', compact = false }) {
  return (
    <div className={`relative ${compact ? 'w-[280px] h-[220px]' : 'aspect-[4/3] w-full'} rounded-3xl ${tint} p-6 md:p-8 flex items-center justify-center overflow-hidden`}>
      {/* Decorative background sparkles */}
      <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full bg-white/40 blur-2xl" />
      <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full bg-[#F7DFCE]/60 blur-2xl" />

      {/* Book */}
      <div className="relative flex shadow-2xl rounded-md" style={{ transform: 'perspective(1200px) rotateY(-8deg) rotateX(4deg)' }}>
        {/* Left page - recipe text */}
        <div className="w-[150px] bg-[#FBF6EA] rounded-l-md p-3 border-r border-neutral-300/70">
          <p className="font-serif-display text-[12px] font-semibold text-neutral-900 leading-tight">Paati’s Sambar</p>
          <p className="text-[8px] text-neutral-500 mt-0.5">By Lakshmi Paati</p>
          <div className="mt-2 space-y-1">
            {['Toor dal — 1 cup', 'Tamarind — lemon size', 'Sambar powder — 2 tbsp', 'Curry leaves — a sprig', 'Mustard seeds', 'Asafoetida — pinch'].map((t, i) => (
              <div key={i} className="flex items-start gap-1">
                <div className="w-1 h-1 rounded-full bg-neutral-500 mt-1.5 flex-shrink-0" />
                <p className="text-[8px] text-neutral-700 leading-snug">{t}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 h-px bg-neutral-300" />
          <p className="text-[7px] italic text-neutral-500 mt-1.5">“Add tamarind after the dal…”</p>
        </div>

        {/* Right page - QR + hear-in-voice callout */}
        <div className="w-[150px] bg-[#FBF6EA] rounded-r-md p-3 flex flex-col items-center justify-center">
          <p className="text-[8px] tracking-[0.12em] font-semibold text-terracotta mb-1.5">HEAR IN HER VOICE</p>
          <QRSvg size={compact ? 72 : 84} />
          <div className="mt-2 flex items-center gap-1 text-neutral-800">
            <Bookmark size={10} className="text-terracotta" />
            <p className="text-[8px] leading-tight text-center">Scan with any phone camera</p>
          </div>
          <div className="mt-2 flex items-center gap-1 bg-[#DFEAD8] px-2 py-0.5 rounded-full">
            <Volume2 size={9} className="text-cumin-green" />
            <span className="text-[8px] text-cumin-green font-medium">2:45</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hand-drawn-style QR (not a real scannable code — decorative)
function QRSvg({ size = 84 }) {
  // Deterministic pattern
  const grid = 9;
  const cells = [];
  const pattern = [
    '111111101',
    '100000101',
    '101110101',
    '101110100',
    '101110111',
    '100000100',
    '111111101',
    '000000011',
    '110101110',
  ];
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      if (pattern[y][x] === '1') cells.push({ x, y });
    }
  }
  return (
    <svg viewBox="0 0 90 90" width={size} height={size} className="rounded" xmlns="http://www.w3.org/2000/svg">
      <rect width="90" height="90" fill="#FBF6EA" />
      {cells.map((c, i) => (
        <rect key={i} x={5 + c.x * 8.75} y={5 + c.y * 8.75} width="8" height="8" rx="1" fill="#3D5A3A" />
      ))}
      {/* Corner alignment blocks */}
      {[[3, 3], [58, 3], [3, 58]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="22" height="22" rx="3" fill="none" stroke="#3D5A3A" strokeWidth="3" />
          <rect x={x + 7} y={y + 7} width="8" height="8" fill="#3D5A3A" />
        </g>
      ))}
    </svg>
  );
}
