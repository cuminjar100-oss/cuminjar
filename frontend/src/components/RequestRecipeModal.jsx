import React, { useState, useEffect, useMemo } from 'react';
import { X, Send, Loader2, MessageCircle, Copy, CheckCircle2, UserPlus, BookUser } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/use-toast';

// Zero-cost "Request a recipe via WhatsApp" flow. We generate a wa.me link
// with a pre-filled message + a public /record/<token> URL, then let the
// user tap Send in WhatsApp themselves. The responder taps the link, records
// on our public page, and the recipe lands in this user's family jar.
export default function RequestRecipeModal({ onClose }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ target_name: '', target_phone: '', dish_name: '' });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [contactsSupported, setContactsSupported] = useState(false);
  const [familyInvites, setFamilyInvites] = useState([]);

  useEffect(() => {
    // Feature-detect the Contact Picker API. Works on Android Chrome + Samsung
    // Internet; falls back to manual entry on iOS Safari + desktop Firefox.
    setContactsSupported(
      typeof navigator !== 'undefined' &&
      'contacts' in navigator &&
      typeof navigator.contacts?.select === 'function'
    );
    // Pull existing family invites so the user can one-tap pick someone they
    // already invited (name pre-fills; phone still typed since email invites
    // don't collect phones — future upgrade).
    api.listInvites().then(setFamilyInvites).catch(() => setFamilyInvites([]));
  }, []);

  const canSubmit = useMemo(
    () => form.target_name.trim().length > 0 && form.dish_name.trim().length > 0,
    [form],
  );

  const pickFromContacts = async () => {
    if (!contactsSupported) return;
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      const c = contacts?.[0];
      if (!c) return;
      const name = Array.isArray(c.name) ? c.name[0] : (c.name || '');
      const phone = Array.isArray(c.tel) ? c.tel[0] : (c.tel || '');
      setForm(f => ({ ...f, target_name: name || f.target_name, target_phone: phone || f.target_phone }));
    } catch (err) {
      // User cancelled or permission denied — silent no-op
      if (err?.name !== 'AbortError') {
        toast({ title: 'Could not open contacts', description: 'Please type the WhatsApp number instead.' });
      }
    }
  };

  const pickFromFamily = (invite) => {
    setForm(f => ({ ...f, target_name: invite.name || f.target_name }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    try {
      const r = await api.createRecipeRequest({
        target_name: form.target_name.trim(),
        target_phone: form.target_phone.replace(/\s+/g, ''),
        dish_name: form.dish_name.trim(),
      });
      setResult(r);
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

  const copyLink = async () => {
    if (!result?.record_url) return;
    try {
      await navigator.clipboard.writeText(result.record_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#DFF5E1] text-[#128C7E] flex items-center justify-center">
              <MessageCircle size={17} />
            </div>
            <h3 className="font-serif-display text-[22px] font-semibold">Request a recipe on WhatsApp</h3>
          </div>
          <button type="button" onClick={onClose} data-testid="close-request-modal" className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={18} /></button>
        </div>

        {!result ? (
          <form onSubmit={submit} className="p-5 space-y-4 overflow-y-auto">
            <p className="text-[13.5px] text-neutral-600">Ask a family member to record their recipe &mdash; they just tap the link, hold the mic, and CuminJar saves it in your jar.</p>

            {/* Quick pickers — top row */}
            {(contactsSupported || familyInvites.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {contactsSupported && (
                  <button
                    type="button"
                    onClick={pickFromContacts}
                    data-testid="request-pick-contact"
                    className="inline-flex items-center gap-1.5 bg-[#DFF5E1] text-[#128C7E] hover:bg-[#c8ecca] px-3 py-2 rounded-full text-[12.5px] font-medium transition-colors"
                  >
                    <BookUser size={13} /> Pick from contacts
                  </button>
                )}
                {familyInvites.slice(0, 3).map(inv => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => pickFromFamily(inv)}
                    data-testid={`request-quick-family-${inv.id}`}
                    className="inline-flex items-center gap-1.5 bg-[#F5EDDD] text-neutral-800 hover:bg-[#EFE3CB] px-3 py-2 rounded-full text-[12.5px] font-medium transition-colors"
                  >
                    <UserPlus size={12} /> {inv.name || inv.email}
                  </button>
                ))}
              </div>
            )}
            {!contactsSupported && (
              <p className="text-[11.5px] text-neutral-500 leading-relaxed bg-[#FFF8E9] border border-[#F0E4C9] rounded-lg px-3 py-2">
                💡 On <b>Android Chrome</b>, tap &ldquo;Pick from contacts&rdquo; to open your phonebook. On iPhone Safari &amp; desktop, type the number below.
              </p>
            )}

            <div>
              <label className="text-[12.5px] font-medium text-neutral-700">Whose recipe do you want?</label>
              <input
                required
                autoFocus
                value={form.target_name}
                onChange={e => setForm({ ...form, target_name: e.target.value.slice(0, 60) })}
                placeholder="e.g., Amma, Paati, Aunt Rekha"
                data-testid="request-target-name"
                className="mt-1 w-full border border-neutral-200 rounded-lg px-3 py-3 text-[15px] focus:outline-none focus:border-cumin-green"
              />
            </div>

            <div>
              <label className="text-[12.5px] font-medium text-neutral-700">Their WhatsApp number <span className="text-neutral-400">(with country code)</span></label>
              <input
                value={form.target_phone}
                onChange={e => setForm({ ...form, target_phone: e.target.value })}
                placeholder="+91 98765 43210"
                data-testid="request-target-phone"
                className="mt-1 w-full border border-neutral-200 rounded-lg px-3 py-3 text-[15px] focus:outline-none focus:border-cumin-green"
                inputMode="tel"
              />
              <p className="text-[11.5px] text-neutral-500 mt-1">Optional &mdash; but if you skip it, you&rsquo;ll have to pick their contact when WhatsApp opens.</p>
            </div>

            <div>
              <label className="text-[12.5px] font-medium text-neutral-700">Which dish do you love?</label>
              <input
                required
                value={form.dish_name}
                onChange={e => setForm({ ...form, dish_name: e.target.value.slice(0, 60) })}
                placeholder="e.g., biriyani, morkuzhambu, rasam"
                data-testid="request-dish-name"
                className="mt-1 w-full border border-neutral-200 rounded-lg px-3 py-3 text-[15px] focus:outline-none focus:border-cumin-green"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit || sending}
              data-testid="request-submit"
              className="w-full mt-2 bg-[#128C7E] text-white py-3.5 rounded-lg font-medium hover:bg-[#0e6f65] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              {sending ? 'Preparing your message…' : 'Open WhatsApp'}
            </button>
          </form>
        ) : (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="rounded-2xl bg-[#F0F6EF] border border-cumin-green/20 p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto text-cumin-green">
                <CheckCircle2 size={22} />
              </div>
              <p className="mt-2 text-[15px] font-medium text-neutral-900">Message ready — tap below to open WhatsApp.</p>
              <p className="text-[12.5px] text-neutral-500 mt-1">Just hit Send inside WhatsApp when it opens.</p>
            </div>

            {/* Message preview */}
            <div className="rounded-xl bg-[#DCF8C6] border border-[#c5e6b0] p-4 text-[13.5px] leading-relaxed text-neutral-800 whitespace-pre-line" data-testid="request-preview">
              {result.message_text}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={openWhatsapp}
                data-testid="request-open-wa"
                className="w-full bg-[#128C7E] text-white py-3.5 rounded-lg font-medium hover:bg-[#0e6f65] transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={17} /> Open WhatsApp &amp; Send
              </button>
              <button
                type="button"
                onClick={copyLink}
                data-testid="request-copy-link"
                className="w-full bg-white border border-neutral-200 text-neutral-800 py-2.5 rounded-lg text-[13.5px] font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? <><CheckCircle2 size={13} className="text-cumin-green" /> Link copied</> : <><Copy size={13} /> Copy record link only</>}
              </button>
            </div>

            <p className="text-[11.5px] text-neutral-500 text-center">
              When {form.target_name || 'they'} record{form.target_name ? 's' : ''} the recipe, it lands in your jar automatically with their voice, ingredients &amp; steps.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
