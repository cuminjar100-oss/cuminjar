import React from 'react';
import { Users, Mic } from 'lucide-react';

export default function FirstRunEmptyState({ userName, onCreateFamily, onRecord }) {
  const firstName = ((userName || '').trim().split(' ')[0]) || 'there';
  return (
    <section
      className="bg-gradient-to-br from-[#F7DFCE]/80 via-white to-[#F1E8D8] rounded-3xl border border-[#E9DEC6] p-6 sm:p-10 text-center overflow-hidden relative"
      data-testid="first-run-onboarding"
    >
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-terracotta/10 blur-2xl" aria-hidden="true" />
      <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-cumin-green/10 blur-2xl" aria-hidden="true" />

      <div className="relative">
        <div className="mx-auto w-16 h-16 rounded-full bg-white border border-[#E9DEC6] flex items-center justify-center shadow-sm text-3xl">
          🫙
        </div>
        <p className="mt-4 text-[11px] font-semibold tracking-[0.18em] text-terracotta uppercase">Welcome to CuminJar</p>
        <h2 className="mt-1 font-serif-display text-[28px] sm:text-[36px] font-semibold text-neutral-900 leading-tight">Hi {firstName} — let’s fill your family jar.</h2>
        <p className="mt-3 text-neutral-700 max-w-xl mx-auto text-[14.5px] leading-relaxed">
          Every jar starts with a family circle and a first memory. Follow the two little steps below and you’ll be preserving voices in minutes.
        </p>

        <ol className="mt-8 grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
          <li className="bg-white rounded-2xl border border-[#E9DEC6] p-5 flex flex-col">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-cumin-green text-white font-semibold flex items-center justify-center">1</span>
              <div>
                <p className="text-[13px] uppercase tracking-wide text-neutral-500 font-semibold">Step one</p>
                <h3 className="font-serif-display text-[20px] font-semibold text-neutral-900 leading-tight">Create your family circle</h3>
              </div>
            </div>
            <p className="mt-3 text-[13.5px] text-neutral-600 leading-relaxed flex-1">Name your family, pick a language you speak at home, and (optionally) upload a photo everyone will recognise.</p>
            <button
              type="button"
              onClick={onCreateFamily}
              data-testid="first-run-create-family"
              className="mt-4 inline-flex items-center justify-center gap-2 bg-cumin-green text-white py-2.5 rounded-lg font-medium hover:bg-[#324A2F] transition-colors text-[13.5px]"
            >
              <Users size={15} /> Create family
            </button>
          </li>
          <li className="bg-white rounded-2xl border border-[#E9DEC6] p-5 flex flex-col">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-terracotta text-white font-semibold flex items-center justify-center">2</span>
              <div>
                <p className="text-[13px] uppercase tracking-wide text-neutral-500 font-semibold">Step two</p>
                <h3 className="font-serif-display text-[20px] font-semibold text-neutral-900 leading-tight">Record your first memory</h3>
              </div>
            </div>
            <p className="mt-3 text-[13.5px] text-neutral-600 leading-relaxed flex-1">Tap Record and simply talk — a recipe, a story, or a festival memory. We transcribe, translate and structure it into a beautiful card automatically.</p>
            <button
              type="button"
              onClick={onRecord}
              data-testid="first-run-record"
              className="mt-4 inline-flex items-center justify-center gap-2 bg-terracotta text-white py-2.5 rounded-lg font-medium hover:bg-[#A85736] transition-colors text-[13.5px]"
            >
              <Mic size={15} /> Tap to record
            </button>
          </li>
        </ol>

        <p className="mt-8 text-[12px] text-neutral-500 italic max-w-md mx-auto">
          Prefer to explore first? Scroll below to browse the demo family jar — every button works.
        </p>
      </div>
    </section>
  );
}
