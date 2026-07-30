import React, { useState, useMemo } from 'react';
import { X, Send, Loader2, MessageCircle } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/use-toast';

// One-step ask: the user just types the dish name. We generate a wa.me link
// (no phone attached) that opens WhatsApp with the message pre-filled and
// WhatsApp's own native contact picker on the next screen — the user selects
// the recipient inside WhatsApp itself, no typing of phone numbers here.
export default function RequestRecipeModal({ onClose }) {
  const { toast } = useToast();
  const [dishName, setDishName] = useState('');
  const [sending, setSending] = useState(false);

  const canSubmit = useMemo(() => dishName.trim().length > 0, [dishName]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    try {
      const r = await api.createRecipeRequest({ dish_name: dishName.trim() });
      // Open WhatsApp — the user picks the contact inside WhatsApp itself.
      try { window.open(r.wa_link, '_blank', 'noopener,noreferrer'); } catch { /* noop */ }
      toast({
        title: 'Request sent! 💌',
        description: `Pick your family member in WhatsApp and hit Send — we\u2019ll drop ${dishName.trim()} into your jar the moment they record it.`,
      });
      // Close modal and return to dashboard
      onClose && onClose();
    } catch (err) {
      toast({ title: 'Could not create request', description: err?.response?.data?.detail || err?.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#DFF5E1] text-[#128C7E] flex items-center justify-center">
              <MessageCircle size={17} />
            </div>
            <h3 className="font-serif-display text-[22px] font-semibold">Ask family via WhatsApp</h3>
          </div>
          <button type="button" onClick={onClose} data-testid="close-request-modal" className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-5">
          <p className="text-[13.5px] text-neutral-600 leading-relaxed">
            Ask family for a recipe, a story, or a tradition &mdash; anything you want to save forever.
          </p>

          <div>
            <label className="text-[12.5px] font-medium text-neutral-700">What do you want a recording of?</label>
            <input
              required
              autoFocus
              value={dishName}
              onChange={e => setDishName(e.target.value.slice(0, 60))}
              placeholder="e.g., biriyani, our Diwali ritual, our love story"
              data-testid="request-dish-name"
              className="mt-1 w-full border border-neutral-200 rounded-lg px-3 py-3.5 text-[16px] focus:outline-none focus:border-cumin-green"
            />
            <p className="text-[11.5px] text-neutral-500 mt-1">The voice note lands in your family jar automatically.</p>
          </div>

          <button
            type="submit"
            disabled={!canSubmit || sending}
            data-testid="request-submit"
            className="w-full bg-[#128C7E] text-white py-3.5 rounded-lg font-medium hover:bg-[#0e6f65] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
            {sending ? 'Opening WhatsApp\u2026' : 'Open WhatsApp'}
          </button>
        </form>
      </div>
    </div>
  );
}
