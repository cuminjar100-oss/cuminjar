import React, { useState, useMemo } from 'react';
import { X, Send, Loader2, MessageCircle, CheckCircle2 } from 'lucide-react';
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
  const [result, setResult] = useState(null);

  const canSubmit = useMemo(() => dishName.trim().length > 0, [dishName]);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    try {
      const r = await api.createRecipeRequest({ dish_name: dishName.trim() });
      setResult(r);
      // Auto-open WhatsApp — user picks contact on next screen.
      // (Pop-up blockers can prevent this if not triggered by user gesture;
      // we still show a big fallback button in the success view.)
      try { window.open(r.wa_link, '_blank', 'noopener,noreferrer'); } catch { /* noop */ }
    } catch (err) {
      toast({ title: 'Could not create request', description: err?.response?.data?.detail || err?.message });
    } finally {
      setSending(false);
    }
  };

  const openWhatsapp = () => {
    if (!result?.wa_link) return;
    window.open(result.wa_link, '_blank', 'noopener,noreferrer');
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

        {!result ? (
          <form onSubmit={submit} className="p-5 space-y-5">
            <p className="text-[13.5px] text-neutral-600 leading-relaxed">
              Just tell us the dish. We&rsquo;ll open WhatsApp with the message ready &mdash; you pick the person inside WhatsApp.
            </p>

            <div>
              <label className="text-[12.5px] font-medium text-neutral-700">Which recipe do you want?</label>
              <input
                required
                autoFocus
                value={dishName}
                onChange={e => setDishName(e.target.value.slice(0, 60))}
                placeholder="e.g., biriyani, morkuzhambu, rasam"
                data-testid="request-dish-name"
                className="mt-1 w-full border border-neutral-200 rounded-lg px-3 py-3.5 text-[16px] focus:outline-none focus:border-cumin-green"
              />
              <p className="text-[11.5px] text-neutral-500 mt-1">The recorded recipe will land in your family jar automatically.</p>
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
        ) : (
          <div className="p-5 space-y-4">
            <div className="rounded-2xl bg-[#F0F6EF] border border-cumin-green/20 p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto text-cumin-green">
                <CheckCircle2 size={22} />
              </div>
              <p className="mt-2 text-[15px] font-medium text-neutral-900">WhatsApp opened in a new tab.</p>
              <p className="text-[12.5px] text-neutral-500 mt-1">Pick a family member in WhatsApp and hit Send.</p>
            </div>

            {/* Message preview */}
            <div className="rounded-xl bg-[#DCF8C6] border border-[#c5e6b0] p-4 text-[13.5px] leading-relaxed text-neutral-800 whitespace-pre-line" data-testid="request-preview">
              {result.message_text}
            </div>

            <button
              type="button"
              onClick={openWhatsapp}
              data-testid="request-open-wa"
              className="w-full bg-[#128C7E] text-white py-3.5 rounded-lg font-medium hover:bg-[#0e6f65] transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle size={17} /> Open WhatsApp again
            </button>

            <p className="text-[11.5px] text-neutral-500 text-center leading-relaxed">
              When they record it, the recipe lands in your jar with their voice, ingredients &amp; steps.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
