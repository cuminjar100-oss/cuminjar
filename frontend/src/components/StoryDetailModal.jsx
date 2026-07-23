import React from 'react';
import { X, Clock, BookOpen, PartyPopper, Share2 } from 'lucide-react';

export default function StoryDetailModal({ story, onClose }) {
  if (!story) return null;
  const s = story;
  const isFestival = s.kind === 'festival';

  const share = () => {
    const body = `${s.title}\n\n${(s.excerpt || s.transcript_en || '').slice(0, 2000)}\n\nSaved on CuminJar`;
    window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
      onClick={onClose}
      data-testid="story-detail-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl max-h-[95vh] overflow-y-auto"
        data-testid="story-detail-modal"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isFestival ? 'bg-[#E4DEF4]' : 'bg-[#DFEAD8]'}`}>
              {isFestival ? <PartyPopper size={17} className="text-[#7A6FB0]" /> : <BookOpen size={17} className="text-[#5D7A4E]" />}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500">{isFestival ? 'Festival Memory' : 'Story'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={share} data-testid="story-detail-share" className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center" title="Share on WhatsApp">
              <Share2 size={16} className="text-[#25D366]" />
            </button>
            <button onClick={onClose} data-testid="story-detail-close" className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={18} /></button>
          </div>
        </div>

        <div className="px-5 sm:px-8 pb-8">
          <h2 className="font-serif-display text-[26px] sm:text-[32px] font-semibold text-neutral-900 leading-tight">{s.title}</h2>
          <p className="text-[12.5px] text-neutral-500 mt-1">By {s.author || 'You'}</p>
          {s.mins && (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-neutral-500"><Clock size={12} /> {s.mins} min listen</div>
          )}

          <div className="mt-5 text-[15px] text-neutral-800 whitespace-pre-wrap leading-relaxed">
            {s.excerpt || s.transcript_en || 'No content'}
          </div>

          {s.source_language && s.source_language !== 'en-IN' && (
            <p className="mt-6 text-[11.5px] text-neutral-500 italic">Originally recorded in {s.source_language}</p>
          )}
        </div>
      </div>
    </div>
  );
}
