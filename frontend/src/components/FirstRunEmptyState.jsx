import React from 'react';
import { Mic, UserPlus } from 'lucide-react';

// Shown once, right after a user first lands on /app with an empty jar.
// Every user is auto-provisioned a "<Name>'s Family" group on first login,
// so onboarding is a single step: tap Record. Inviting family is optional.
export default function FirstRunEmptyState({ userName, onRecord, onInvite }) {
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
        <h2 className="mt-1 font-serif-display text-[28px] sm:text-[36px] font-semibold text-neutral-900 leading-tight">
          Hi {firstName} — save your first recipe.
        </h2>
        <p className="mt-3 text-neutral-700 max-w-xl mx-auto text-[14.5px] leading-relaxed">
          Your <b>{firstName}&rsquo;s Family</b> jar is empty and waiting. Just tap Record and start talking — a recipe,
          a story, or a festival memory. We&rsquo;ll transcribe, translate and preserve it forever.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <button
            type="button"
            onClick={onRecord}
            data-testid="first-run-record"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-terracotta text-white px-6 py-3 rounded-lg font-medium hover:bg-[#A85736] transition-colors text-[14.5px] shadow-sm"
          >
            <Mic size={16} /> Save your first recipe
          </button>
          {onInvite && (
            <button
              type="button"
              onClick={onInvite}
              data-testid="first-run-invite"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-neutral-200 text-neutral-800 px-6 py-3 rounded-lg font-medium hover:border-cumin-green hover:text-cumin-green transition-colors text-[14.5px]"
            >
              <UserPlus size={16} /> Invite family
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
