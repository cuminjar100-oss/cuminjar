import React, { useState, useEffect, useCallback } from 'react';
import { X, Mail, Loader2, Trash2, Send, Clock, CheckCircle2 } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/use-toast';

const RELATIONS = ['Mother', 'Father', 'Sister', 'Brother', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Cousin', 'Spouse', 'Child', 'Other'];

export default function InviteFamilyModal({ onClose }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', name: '', relation: 'Mother' });
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setInvites(await api.listInvites()); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const saved = await api.createInvite(form);
      setInvites(prev => [saved, ...prev]);
      setForm({ email: '', name: '', relation: 'Mother' });
      toast({ title: 'Invite sent!', description: `${saved.email} will get an email invitation.` });
    } catch (err) {
      toast({ title: 'Could not send invite', description: err?.response?.data?.detail || 'Please try again.' });
    } finally { setSending(false); }
  };

  const remove = async (id) => {
    setInvites(prev => prev.filter(i => i.id !== id));
    try { await api.deleteInvite(id); } catch { load(); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h3 className="font-serif-display text-[24px] font-semibold">Invite family</h3>
            <p className="text-[13px] text-neutral-500 mt-0.5">Send a private invitation to join your family jar.</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={17} /></button>
        </div>

        <form onSubmit={send} className="px-6 py-5 grid md:grid-cols-2 gap-3">
          <label className="block md:col-span-2">
            <span className="text-[13px] font-semibold text-neutral-800">Email address</span>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="paati@family.com" className="w-full bg-white border border-neutral-200 rounded-lg pl-9 pr-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" />
            </div>
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold text-neutral-800">Name (optional)</span>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Lakshmi Paati" className="mt-1.5 w-full bg-white border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" />
          </label>
          <label className="block">
            <span className="text-[13px] font-semibold text-neutral-800">Relation</span>
            <select value={form.relation} onChange={e => setForm({...form, relation: e.target.value})} className="mt-1.5 w-full bg-white border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10">
              {RELATIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </label>
          <button disabled={sending} type="submit" className="md:col-span-2 mt-2 bg-cumin-green text-white py-3 rounded-lg text-[14px] font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send invitation
          </button>
        </form>

        <div className="px-6 py-4 border-t border-neutral-100">
          <h4 className="font-semibold text-[15px] text-neutral-900">Sent invitations</h4>
          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-neutral-400" size={18} /></div>
          ) : invites.length === 0 ? (
            <p className="text-[13.5px] text-neutral-500 mt-3">No invitations yet. Send your first one above!</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {invites.map(i => (
                <li key={i.id} className="flex items-center gap-3 bg-[#FBF6EE] border border-neutral-200/70 rounded-lg px-4 py-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#F7DFCE] flex items-center justify-center text-terracotta">
                    <Mail size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-neutral-900 truncate">{i.name || i.email}</p>
                    <p className="text-[12px] text-neutral-500 truncate">{i.email}{i.relation ? ` · ${i.relation}` : ''}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-1 rounded-full flex items-center gap-1 ${i.status === 'accepted' ? 'bg-[#DFEAD8] text-cumin-green' : 'bg-[#FBE3D2] text-terracotta'}`}>
                    {i.status === 'accepted' ? <><CheckCircle2 size={11}/> Accepted</> : <><Clock size={11}/> Pending</>}
                  </span>
                  <button onClick={() => remove(i.id)} className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center text-neutral-400 hover:text-terracotta transition-colors"><Trash2 size={13} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
