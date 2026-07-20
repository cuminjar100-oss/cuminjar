import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, placeholderFor, entryImageSrc } from "@/lib/api";
import { useAuth, formatApiError } from "@/context/AuthContext";
import * as appData from "@/lib/appData";
import Header from "@/components/Header";
import { ArrowLeft, Mic, Pencil, Users, UserPlus, Trash2, Crown, Soup, Clock, Download, Copy, Check, AlertTriangle, LogOut } from "lucide-react";

export default function VaultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);

  const refresh = async () => {
    if (!user) return;
    try {
      const [b, r] = await Promise.all([
        appData.getVault(user, id),
        appData.listVaultEntries(user, id),
      ]);
      setBook(b);
      setEntries(r);
    } catch {
      navigate("/", { replace: true });
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id, user]);

  const sendInvite = async (e) => {
    e.preventDefault();
    setInviteBusy(true); setInviteError(null); setInviteMsg(null); setInviteResult(null);
    try {
      const data = await appData.inviteToVault(user, id, inviteEmail.trim());
      setInviteResult(data);
      if (data.added) {
        setInviteMsg(data.email_sent ? "Added to the vault — and we emailed them." : "Added to the vault!");
      } else if (data.already_pending && data.email_sent) {
        setInviteMsg("They're already invited — we re-sent the email just in case.");
      } else if (data.already_pending) {
        setInviteMsg("They're already invited. Share the link below if the original email didn't arrive.");
      } else if (data.email_sent) {
        setInviteMsg("Invite sent — they'll join when they sign up with that email.");
      } else {
        setInviteMsg("Invite saved. Email couldn't be sent automatically — copy the link below and share it yourself.");
      }
      setInviteEmail("");
      refresh();
    } catch (err) {
      setInviteError(formatApiError(err, "Couldn't send that invite."));
    } finally {
      setInviteBusy(false);
    }
  };

  const [copiedInvite, setCopiedInvite] = useState(false);
  const copyInviteUrl = async () => {
    if (!inviteResult?.accept_url) return;
    try {
      await navigator.clipboard.writeText(inviteResult.accept_url);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 1800);
    } catch {}
  };

  const revokeInvite = async (invId) => {
    try { await appData.revokeInvitation(user, id, invId); refresh(); } catch {}
  };

  const removeMember = async (uid) => {
    try { await appData.removeMember(user, id, uid); refresh(); } catch {}
  };

  const [pdfBusy, setPdfBusy] = useState(false);
  const downloadPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const resp = await api.get(`/vaults/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url;
      const safe = (book?.name || "vault").replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "_") || "vault";
      a.download = `${safe}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      // ignore — keep it quiet
    } finally {
      setPdfBusy(false);
    }
  };

  const [confirmAction, setConfirmAction] = useState(null); // 'delete' | 'leave' | null
  const [destructBusy, setDestructBusy] = useState(false);
  const [destructError, setDestructError] = useState(null);
  const deleteVault = async () => {
    setDestructBusy(true); setDestructError(null);
    try {
      await appData.deleteVault(user, id);
      navigate("/", { replace: true });
    } catch (err) {
      setDestructError(formatApiError(err, "Couldn't delete this vault."));
      setDestructBusy(false);
    }
  };
  const leaveVault = async () => {
    setDestructBusy(true); setDestructError(null);
    try {
      await appData.leaveVault(user, id);
      navigate("/", { replace: true });
    } catch (err) {
      setDestructError(formatApiError(err, "Couldn't leave this vault."));
      setDestructBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <Header />
        <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
          <div data-testid="vault-loading" className="bg-[#F6F3EB] rounded-3xl p-10 border border-[#8C857B]/15 animate-pulse">
            <div className="h-8 w-1/3 bg-[#8C857B]/20 rounded-full mb-4" />
            <div className="h-4 w-2/3 bg-[#8C857B]/15 rounded-full" />
          </div>
        </main>
      </div>
    );
  }
  if (!book) return null;

  const isOwner = book.my_role === "owner";

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <Link to="/" data-testid="back-to-vaults" className="inline-flex items-center gap-2 text-[#5B6359] hover:text-[#D96C4A] transition-colors mb-6">
          <ArrowLeft size={18} /> All vaults
        </Link>

        <header className="mb-10 animate-fadeUp flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="uppercase tracking-[0.3em] text-xs text-[#8C857B] mb-2">
              {book.members.length} {book.members.length === 1 ? "member" : "members"} · {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </p>
            <h1 data-testid="vault-name" className="font-display text-4xl sm:text-5xl text-[#2C302B] leading-tight">
              {book.name}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              data-testid="record-entry-button"
              onClick={() => navigate(`/vaults/${id}/record`)}
              className="btn-press inline-flex items-center gap-2 bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-5 py-2.5 font-semibold transition-all shadow-sm"
            >
              <Mic size={16} /> Record a entry
            </button>
            <button
              data-testid="type-entry-button"
              onClick={() => navigate(`/vaults/${id}/new`)}
              className="btn-press inline-flex items-center gap-2 bg-white border-2 border-[#8C857B]/20 text-[#2C302B] rounded-full px-5 py-2.5 font-semibold hover:border-[#D96C4A]/50 hover:bg-[#F6F3EB] transition-all"
            >
              <Pencil size={16} /> Type one
            </button>
            <button
              data-testid="members-button"
              onClick={() => setShowMembers((s) => !s)}
              className="btn-press inline-flex items-center gap-2 bg-white border-2 border-[#8C857B]/20 text-[#2C302B] rounded-full px-4 py-2.5 font-semibold hover:bg-[#F6F3EB] transition-all"
            >
              <Users size={16} /> Members
            </button>
            {entries.length > 0 && (
              <button
                data-testid="download-pdf-button"
                onClick={downloadPdf}
                disabled={pdfBusy}
                title="Download as a printable, shareable PDF"
                className="btn-press inline-flex items-center gap-2 bg-white border-2 border-[#8C857B]/20 text-[#2C302B] rounded-full px-4 py-2.5 font-semibold hover:border-[#D96C4A]/50 hover:bg-[#F6F3EB] transition-all disabled:opacity-60 disabled:cursor-wait"
              >
                <Download size={16} /> {pdfBusy ? "Preparing…" : "Download PDF"}
              </button>
            )}
            {isOwner && (
              <button
                data-testid="invite-button"
                onClick={() => setShowInvite((s) => !s)}
                className="btn-press inline-flex items-center gap-2 bg-[#5B7053] hover:bg-[#4a5c45] text-white rounded-full px-4 py-2.5 font-semibold transition-all shadow-sm"
              >
                <UserPlus size={16} /> Invite
              </button>
            )}
            {isOwner ? (
              <button
                data-testid="delete-vault-button"
                onClick={() => { setDestructError(null); setConfirmAction("delete"); }}
                title="Permanently delete this vault"
                className="btn-press inline-flex items-center gap-2 bg-white border-2 border-[#B54A4A]/30 text-[#B54A4A] rounded-full px-4 py-2.5 font-semibold hover:bg-[#B54A4A]/10 transition-all"
              >
                <Trash2 size={16} /> Delete
              </button>
            ) : (
              <button
                data-testid="leave-vault-button"
                onClick={() => { setDestructError(null); setConfirmAction("leave"); }}
                title="Leave this vault"
                className="btn-press inline-flex items-center gap-2 bg-white border-2 border-[#8C857B]/20 text-[#5B6359] rounded-full px-4 py-2.5 font-semibold hover:border-[#B54A4A]/40 hover:text-[#B54A4A] transition-all"
              >
                <LogOut size={16} /> Leave
              </button>
            )}
          </div>
        </header>

        {showMembers && (
          <section data-testid="members-panel" className="bg-[#F6F3EB] rounded-3xl p-6 border border-[#8C857B]/15 mb-6 animate-fadeUp">
            <h2 className="font-display text-xl text-[#2C302B] mb-4">Members</h2>
            <ul className="space-y-2">
              {book.members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-3 bg-white rounded-2xl px-4 py-3 border border-[#8C857B]/15">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#2C302B] flex items-center gap-2 truncate">
                      {m.name}
                      {m.role === "owner" && <Crown size={14} className="text-[#D9A05B]" />}
                    </p>
                    <p className="text-xs text-[#8C857B] truncate">{m.email}</p>
                  </div>
                  {isOwner && m.role !== "owner" && (
                    <button
                      data-testid="remove-member-button"
                      onClick={() => removeMember(m.user_id)}
                      className="btn-press w-9 h-9 rounded-full border-2 border-[#8C857B]/20 text-[#8C857B] hover:text-[#B54A4A] hover:border-[#B54A4A]/40 flex items-center justify-center transition-colors flex-shrink-0"
                      title="Remove from vault"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {isOwner && showInvite && (
          <section data-testid="invite-panel" className="bg-[#F6F3EB] rounded-3xl p-6 border border-[#8C857B]/15 mb-6 animate-fadeUp">
            <h2 className="font-display text-xl text-[#2C302B] mb-2">Invite a family member</h2>
            <p className="text-sm text-[#5B6359] mb-4">
              They'll join automatically when they sign up with this email — or instantly if they already have an account.
            </p>
            <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email" required value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="cousin@example.com" data-testid="invite-email-input"
                className="flex-1 bg-white border-2 border-[#8C857B]/20 rounded-full px-5 py-3 text-[#2C302B] focus:border-[#D96C4A] focus:ring-4 focus:ring-[#D96C4A]/20 outline-none transition-all placeholder:text-[#8C857B]"
              />
              <button
                type="submit" disabled={inviteBusy} data-testid="invite-submit-button"
                className="btn-press bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-6 py-3 font-semibold shadow-sm disabled:opacity-60"
              >
                {inviteBusy ? "Sending…" : "Send invite"}
              </button>
            </form>
            {inviteMsg && <p data-testid="invite-success" className="text-sm text-[#5B7053] mt-3">{inviteMsg}</p>}
            {inviteError && <p data-testid="invite-error" className="text-sm text-[#B54A4A] mt-3">{inviteError}</p>}

            {inviteResult?.accept_url && (
              <div data-testid="invite-link-block" className="mt-4 bg-white rounded-2xl border border-[#8C857B]/15 p-4">
                <p className="text-xs uppercase tracking-wider text-[#8C857B] font-semibold mb-2">
                  {inviteResult.email_sent ? "Or share this link directly" : "Couldn't email them — share this link instead"}
                </p>
                <p className="text-xs text-[#5B6359] font-mono break-all bg-[#F6F3EB] rounded-lg px-3 py-2 mb-3">{inviteResult.accept_url}</p>
                <button
                  data-testid="copy-invite-link-button"
                  onClick={copyInviteUrl}
                  className="btn-press inline-flex items-center gap-2 bg-white border-2 border-[#8C857B]/20 text-[#2C302B] hover:border-[#D96C4A]/50 hover:bg-[#F6F3EB] rounded-full px-4 py-2 text-sm font-semibold transition-all"
                >
                  {copiedInvite ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy invite link</>}
                </button>
                {inviteResult.email_error && (
                  <p className="text-[11px] text-[#8C857B] mt-2 italic">
                    Email service: {inviteResult.email_error.includes("verify a domain") ? "free Resend tier only emails the account owner — verify a domain at resend.com/domains to email anyone, or just share the link above." : inviteResult.email_error}
                  </p>
                )}
              </div>
            )}

            {book.invitations?.length > 0 && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wider text-[#8C857B] mb-2">Pending invitations</p>
                <ul className="space-y-2">
                  {book.invitations.filter((i) => i.status === "pending").map((inv) => (
                    <li key={inv.invitation_id} className="flex items-center justify-between bg-white rounded-2xl border border-[#8C857B]/15 px-4 py-3">
                      <span className="text-sm text-[#2C302B] truncate">{inv.email}</span>
                      <button
                        data-testid="revoke-invite-button"
                        onClick={() => revokeInvite(inv.invitation_id)}
                        className="btn-press w-8 h-8 rounded-full border-2 border-[#8C857B]/20 text-[#8C857B] hover:text-[#B54A4A] hover:border-[#B54A4A]/40 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {entries.length === 0 ? (
          <div data-testid="entries-empty" className="bg-[#F6F3EB] rounded-3xl p-8 sm:p-14 border border-[#8C857B]/15 text-center">
            <Soup size={40} className="mx-auto text-[#D96C4A] mb-4" />
            <h2 className="font-display text-2xl sm:text-3xl text-[#2C302B] mb-3">No entries yet</h2>
            <p className="text-[#5B6359] max-w-md mx-auto mb-6">
              Tap <strong>Record a entry</strong> and just talk through one — in any language. We'll save your voice
              and turn it into a step-by-step card.
            </p>
            <button
              onClick={() => navigate(`/vaults/${id}/record`)}
              data-testid="empty-record-button"
              className="btn-press inline-flex items-center gap-2 bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-7 py-3 font-semibold shadow-sm"
            >
              <Mic size={16} /> Record the first one
            </button>
          </div>
        ) : (
          <section data-testid="entries-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((r, idx) => (
              <Link
                key={r.entry_id} to={`/entries/${r.entry_id}`}
                data-testid="entry-card"
                className="card-hover block bg-[#F6F3EB] rounded-3xl p-4 border border-[#8C857B]/15 animate-fadeUp"
                style={{ animationDelay: `${Math.min(idx * 60, 360)}ms` }}
              >
                <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#8C857B]/10 mb-4 relative">
                  <img src={entryImageSrc(r) || placeholderFor(r.entry_id)} alt={r.title} className="w-full h-full object-cover" loading="lazy" />
                  {r.has_audio && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-[#2C302B]/85 text-white text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 backdrop-blur-sm">
                      <Mic size={11} /> Voice
                    </span>
                  )}
                </div>
                <div className="px-1 pb-2">
                  <h3 data-testid="entry-card-title" className="font-display text-xl sm:text-2xl text-[#2C302B] leading-tight line-clamp-2">{r.title}</h3>
                  {r.description && <p className="text-sm text-[#5B6359] mt-2 leading-relaxed line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-3 mt-4 text-xs text-[#8C857B]">
                    {r.prep_time && <span className="inline-flex items-center gap-1"><Clock size={12} /> {r.prep_time}</span>}
                    <span className="ml-auto">From {r.created_by_name}</span>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>

      {confirmAction && (
        <div
          data-testid="confirm-overlay"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-[#2C302B]/60 backdrop-blur-sm flex items-center justify-center p-5 z-50 animate-fadeUp"
          onClick={(e) => { if (e.target === e.currentTarget && !destructBusy) setConfirmAction(null); }}
        >
          <div className="bg-[#FDFBF7] rounded-3xl border border-[#8C857B]/15 max-w-md w-full p-6 sm:p-8 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-11 h-11 rounded-full bg-[#B54A4A]/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="text-[#B54A4A]" size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-2xl text-[#2C302B] leading-tight">
                  {confirmAction === "delete" ? "Delete this vault?" : "Leave this vault?"}
                </h3>
                <p className="text-sm text-[#5B6359] mt-2 leading-relaxed">
                  {confirmAction === "delete" ? (
                    <>
                      <strong className="text-[#2C302B]">{book.name}</strong> and every entry, comment, and recording inside it will be permanently removed for everyone. This can't be undone.
                    </>
                  ) : (
                    <>
                      You'll be removed from <strong className="text-[#2C302B]">{book.name}</strong> and won't see its entries anymore. The owner can re-invite you later.
                    </>
                  )}
                </p>
              </div>
            </div>

            {destructError && (
              <p data-testid="confirm-error" className="text-sm text-[#B54A4A] bg-[#B54A4A]/10 border border-[#B54A4A]/20 rounded-2xl px-4 py-3 mb-4">{destructError}</p>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                data-testid="confirm-cancel-button"
                disabled={destructBusy}
                onClick={() => setConfirmAction(null)}
                className="btn-press bg-white border-2 border-[#8C857B]/20 text-[#2C302B] rounded-full px-6 py-2.5 font-semibold hover:bg-[#F6F3EB] transition-all disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-destruct-button"
                disabled={destructBusy}
                onClick={confirmAction === "delete" ? deleteVault : leaveVault}
                className="btn-press inline-flex items-center justify-center gap-2 bg-[#B54A4A] hover:bg-[#993E3E] text-white rounded-full px-6 py-2.5 font-semibold shadow-sm transition-all disabled:opacity-60"
              >
                {destructBusy ? "Working…" : confirmAction === "delete" ? (<><Trash2 size={16} /> Delete forever</>) : (<><LogOut size={16} /> Leave vault</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
