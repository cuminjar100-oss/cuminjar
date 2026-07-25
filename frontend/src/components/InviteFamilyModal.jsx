import React, { useState, useEffect, useCallback } from 'react';
import { X, Mail, Loader2, Trash2, Send, Clock, CheckCircle2, AlertTriangle, RefreshCw, QrCode, Download, Copy } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/use-toast';

const RELATIONS = ['Mother', 'Father', 'Sister', 'Brother', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Cousin', 'Spouse', 'Child', 'Other'];

export default function InviteFamilyModal({ onClose }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', name: '', relation: 'Mother' });
  const [sending, setSending] = useState(false);
  const [family, setFamily] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invitesResp, familiesResp] = await Promise.all([
        api.listInvites(),
        api.listFamilies().catch(() => []),
      ]);
      setInvites(invitesResp);
      setFamily(familiesResp?.[0] || null);
    } catch (e) { console.error(e); }
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
      if (saved.email_sent) {
        toast({ title: 'Invite sent!', description: `${saved.email} will get an email invitation.` });
      } else {
        toast({
          title: 'Invite saved, but email delivery failed',
          description: `Resend rejected the message: ${saved.email_error || 'unknown error'}. Verify your Resend domain (see /app/docs/RESEND_DOMAIN_SETUP.md) and click Resend on the invite.`,
        });
      }
    } catch (err) {
      toast({ title: 'Could not send invite', description: err?.response?.data?.detail || 'Please try again.' });
    } finally { setSending(false); }
  };

  const resend = async (id) => {
    try {
      const updated = await api.resendInvite(id);
      setInvites(prev => prev.map(i => i.id === id ? updated : i));
      toast({
        title: updated.email_sent ? 'Invite email sent!' : 'Email delivery still failing',
        description: updated.email_sent ? `${updated.email} will get the email now.` : (updated.email_error || 'Check Resend domain verification.'),
      });
    } catch (err) {
      toast({ title: 'Could not resend', description: err?.response?.data?.detail || err?.message });
    }
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

        {family?.id && (
          <div className="mx-6 -mt-1 mb-4 rounded-xl bg-[#FBF6EE] border border-neutral-200/70 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowQr(v => !v)}
              data-testid="toggle-invite-qr"
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F5EBD8] transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-terracotta">
                <QrCode size={17} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-neutral-900">Or invite with a QR code</p>
                <p className="text-[11.5px] text-neutral-500">Scan to join instantly &mdash; perfect for grandparents.</p>
              </div>
              <span className="text-[12px] text-cumin-green font-medium">{showQr ? 'Hide' : 'Show'}</span>
            </button>
            {showQr && (
              <InviteQrPanel family={family} />
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-neutral-100">
          <h4 className="font-semibold text-[15px] text-neutral-900">Sent invitations</h4>
          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-neutral-400" size={18} /></div>
          ) : invites.length === 0 ? (
            <p className="text-[13.5px] text-neutral-500 mt-3">No invitations yet. Send your first one above!</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {invites.map(i => (
                <li key={i.id} className={`flex items-center gap-3 border rounded-lg px-4 py-2.5 ${i.status === 'email_failed' ? 'bg-[#FDECEA] border-[#F5C6BE]' : 'bg-[#FBF6EE] border-neutral-200/70'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${i.status === 'email_failed' ? 'bg-[#F7C7BE] text-red-700' : 'bg-[#F7DFCE] text-terracotta'}`}>
                    {i.status === 'email_failed' ? <AlertTriangle size={15} /> : <Mail size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-neutral-900 truncate">{i.name || i.email}</p>
                    <p className="text-[12px] text-neutral-500 truncate">{i.email}{i.relation ? ` · ${i.relation}` : ''}</p>
                    {i.status === 'email_failed' && i.email_error && (
                      <p className="text-[11px] text-red-700 mt-0.5 line-clamp-2" data-testid={`invite-error-${i.id}`}>Email failed: {i.email_error}</p>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
                      i.status === 'accepted' ? 'bg-[#DFEAD8] text-cumin-green' :
                      i.status === 'email_failed' ? 'bg-red-100 text-red-700' :
                      i.status === 'sent' ? 'bg-[#DFEAD8] text-cumin-green' :
                      'bg-[#FBE3D2] text-terracotta'
                    }`}
                    data-testid={`invite-status-${i.id}`}
                  >
                    {i.status === 'accepted' && <><CheckCircle2 size={11}/> Accepted</>}
                    {i.status === 'sent' && <><CheckCircle2 size={11}/> Sent</>}
                    {i.status === 'email_failed' && <><AlertTriangle size={11}/> Email failed</>}
                    {(!i.status || i.status === 'pending') && <><Clock size={11}/> Pending</>}
                  </span>
                  {i.status === 'email_failed' && (
                    <button
                      type="button"
                      onClick={() => resend(i.id)}
                      data-testid={`invite-resend-${i.id}`}
                      title="Retry sending"
                      className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center text-neutral-500 hover:text-cumin-green transition-colors"
                    ><RefreshCw size={13} /></button>
                  )}
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

function InviteQrPanel({ family }) {
  const { toast } = useToast();
  const [qrReady, setQrReady] = useState(false);
  const [ensuring, setEnsuring] = useState(false);
  const [shareToken, setShareToken] = useState(family.share_token || null);
  const qrUrl = `${api.familyInviteQrUrl(family.id)}?v=${family.id}`;
  const joinUrl = shareToken ? `${window.location.origin}/join/${shareToken}` : null;

  useEffect(() => {
    // If share_token isn't on the family object yet, trigger the share endpoint
    // once so the join URL exists for copy/link before we render the QR.
    (async () => {
      if (family.share_token) { setShareToken(family.share_token); return; }
      setEnsuring(true);
      try {
        const r = await api.shareFamily(family.id);
        setShareToken(r.share_token);
      } catch { /* noop */ } finally { setEnsuring(false); }
    })();
  }, [family.id, family.share_token]);

  const downloadPng = async () => {
    try {
      const resp = await fetch(qrUrl, { credentials: 'include' });
      const blob = await resp.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${(family.name || 'family').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-cuminjar-invite-qr.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
      toast({ title: 'QR code downloaded', description: 'Print it and paste on the fridge — family scans to join.' });
    } catch {
      toast({ title: 'Download failed', description: 'Try again in a moment.' });
    }
  };

  const copyLink = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      toast({ title: 'Join link copied', description: joinUrl });
    } catch {
      toast({ title: 'Copy failed', description: joinUrl });
    }
  };

  return (
    <div className="border-t border-neutral-200/70 px-4 py-4 flex flex-col sm:flex-row items-center gap-4" data-testid="invite-qr-panel">
      <div className="w-40 h-40 shrink-0 bg-white rounded-xl border border-neutral-200 flex items-center justify-center overflow-hidden">
        {ensuring || !shareToken ? (
          <Loader2 className="animate-spin text-neutral-400" size={18} />
        ) : (
          <img
            src={qrUrl}
            alt={`Scan to join ${family.name} on CuminJar`}
            className="w-full h-full object-contain p-2"
            onLoad={() => setQrReady(true)}
            data-testid="invite-qr-image"
          />
        )}
      </div>
      <div className="flex-1 min-w-0 text-center sm:text-left">
        <p className="text-[13.5px] text-neutral-800 leading-relaxed">
          Family scans this with any phone camera and lands on a one-tap join screen for <b>{family.name}</b>.
        </p>
        {joinUrl && (
          <p className="mt-1 text-[11.5px] text-neutral-500 truncate">{joinUrl}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <button
            type="button"
            onClick={downloadPng}
            disabled={!qrReady}
            data-testid="download-invite-qr"
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-full bg-cumin-green text-white hover:bg-[#324A2F] transition-colors disabled:opacity-60"
          >
            <Download size={13} /> Download PNG
          </button>
          <button
            type="button"
            onClick={copyLink}
            disabled={!joinUrl}
            data-testid="copy-invite-link"
            className="inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50 transition-colors disabled:opacity-60"
          >
            <Copy size={13} /> Copy link
          </button>
        </div>
      </div>
    </div>
  );
}
