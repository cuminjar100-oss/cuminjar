import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { API, placeholderFor, entryImageSrc, resolveImageUrl } from "@/lib/api";
import { useAuth, formatApiError } from "@/context/AuthContext";
import * as appData from "@/lib/appData";
import Header from "@/components/Header";
import { ArrowLeft, Clock, Users, ChefHat, Pencil, Trash2, MessageCircle, Send, Mic, Camera, Sparkles, Plus, Check, X, Printer } from "lucide-react";
import { formatEntryForShare, entryShareUrl, shareViaWhatsApp } from "@/lib/share";

export default function EntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  const [book, setBook] = useState(null);

  const audioRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      try {
        const entryData = await appData.getEntry(user, id);
        if (!mounted) return;
        setEntry(entryData);
        const [c, b] = await Promise.all([
          appData.listEntryComments(user, id),
          appData.getVault(user, entryData.vault_id),
        ]);
        if (!mounted) return;
        setComments(c);
        setBook(b);
      } catch (e) {
        if (mounted) setError(formatApiError(e, "We couldn't open that entry."));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, user]);

  const canEdit = entry && user && (user.user_id === entry.created_by_user_id || book?.my_role === "owner");

  const handleDelete = async () => {
    try {
      await appData.deleteEntry(user, id);
      navigate(book ? `/vaults/${book.vault_id}` : "/", { replace: true });
    } catch (e) {
      setError(formatApiError(e, "Could not delete this entry."));
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentBusy(true);
    try {
      const data = await appData.addEntryComment(user, id, commentText.trim());
      setComments((p) => [...p, data]);
      setCommentText("");
    } catch {} finally { setCommentBusy(false); }
  };

  const deleteComment = async (cid) => {
    try { await appData.deleteComment(user, cid); setComments((p) => p.filter((c) => c.comment_id !== cid)); } catch {}
  };

  const audioSrc = useMemo(() => entry?.has_audio ? `${API}/entries/${id}/audio` : null, [entry, id]);
  const backHref = book ? `/vaults/${book.vault_id}` : "/";

  const handleWhatsAppShare = () => {
    if (!entry) return;
    const url = entryShareUrl(id);
    const text = formatEntryForShare(entry, book, url);
    shareViaWhatsApp({ text, url, title: entry.title });
  };

  // ---- Inline edit for prep_time / cook_time / servings ----
  const [editingField, setEditingField] = useState(null); // 'prep_time' | 'cook_time' | 'servings' | null
  const [editValue, setEditValue] = useState("");
  const startEdit = (field) => {
    setEditingField(field);
    setEditValue(entry[field] || "");
  };
  const cancelEdit = () => { setEditingField(null); setEditValue(""); };
  const saveEdit = async () => {
    if (!editingField) return;
    const next = editValue.trim();
    const payload = { [editingField]: next || null };
    try {
      const data = await appData.updateEntry(user, id, payload);
      setEntry(data);
      cancelEdit();
    } catch (e) {
      setError(formatApiError(e, "Couldn't save that change."));
    }
  };

  // ---- Image upload + regenerate ----
  const fileInputRef = useRef(null);
  const [imgBusy, setImgBusy] = useState(null); // 'upload' | 'regen' | null
  const [imgVersion, setImgVersion] = useState(0);
  const [resolvedImgSrc, setResolvedImgSrc] = useState(null);
  const triggerUpload = () => fileInputRef.current?.click();
  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("Image is too large — please use one under 8 MB.");
      return;
    }
    setImgBusy("upload"); setError(null);
    try {
      const result = await appData.uploadEntryImageFile(user, id, file);
      const image_url = result?.image_url;
      setEntry((r) => ({ ...r, image_url }));
      setImgVersion((v) => v + 1);
    } catch (err) {
      setError(formatApiError(err, "Couldn't upload that photo."));
    } finally { setImgBusy(null); }
  };
  const regenerateImage = async () => {
    if (imgBusy) return;
    setImgBusy("regen"); setError(null);
    try {
      const data = await appData.regenerateEntryImage(user, id);
      setEntry((r) => ({ ...r, image_url: data.image_url }));
      setImgVersion((v) => v + 1);
    } catch (err) {
      setError(formatApiError(err, "Couldn't regenerate the photo."));
    } finally { setImgBusy(null); }
  };

  useEffect(() => {
    if (!entry?.image_url) {
      setResolvedImgSrc(entry ? placeholderFor(entry.entry_id) : null);
      return;
    }
    const base = entryImageSrc(entry) || resolveImageUrl(entry.image_url);
    setResolvedImgSrc(`${base}${base.includes("?") ? "&" : "?"}_=${imgVersion}`);
  }, [entry, imgVersion]);

  const imgSrc = resolvedImgSrc ?? (entry ? placeholderFor(entry.entry_id) : null);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      <main className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
        <Link to={backHref} data-testid="back-to-vault" data-print-hide className="inline-flex items-center gap-2 text-[#5B6359] hover:text-[#D96C4A] transition-colors mb-6">
          <ArrowLeft size={18} /> Back to {book?.name || "vault"}
        </Link>

        {loading ? (
          <div data-testid="entry-detail-loading" className="animate-pulse bg-[#F6F3EB] rounded-3xl p-8 border border-[#8C857B]/15">
            <div className="h-8 w-2/3 bg-[#8C857B]/20 rounded-full mb-4" />
            <div className="h-4 w-full bg-[#8C857B]/15 rounded-full mb-2" />
            <div className="h-4 w-5/6 bg-[#8C857B]/15 rounded-full" />
          </div>
        ) : error ? (
          <div data-testid="entry-error" className="bg-[#F6F3EB] rounded-3xl p-8 border border-[#B54A4A]/30 text-[#B54A4A]">{error}</div>
        ) : (
          <article data-testid="entry-detail" data-print-area="entry" className="animate-fadeUp">
            <div data-print-hero className="aspect-[16/9] w-full rounded-3xl overflow-hidden bg-[#8C857B]/10 mb-8 border border-[#8C857B]/15 relative group">
              <img src={imgSrc} alt={entry.title} className="w-full h-full object-cover" />
              {entry.has_audio && (
                <span data-print-hide className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-[#2C302B]/85 text-white text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1.5 backdrop-blur-sm">
                  <Mic size={13} /> Recorded by {entry.created_by_name}
                </span>
              )}
              {canEdit && (
                <div data-testid="entry-image-controls" data-print-hide className="absolute bottom-4 right-4 flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef} type="file" accept="image/*"
                    onChange={onPickFile} className="hidden" data-testid="entry-image-file-input"
                  />
                  <button
                    type="button" onClick={triggerUpload} disabled={!!imgBusy}
                    data-testid="entry-image-upload-button"
                    className="btn-press inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-[#8C857B]/20 text-[#2C302B] hover:bg-white rounded-full px-4 py-2 text-sm font-semibold shadow-md transition-all disabled:opacity-50"
                    title="Upload your own photo"
                  >
                    {imgBusy === "upload" ? <span className="w-4 h-4 rounded-full border-2 border-[#8C857B]/30 border-t-[#2C302B] animate-spin" /> : <Camera size={14} />}
                    Upload photo
                  </button>
                  <button
                    type="button" onClick={regenerateImage} disabled={!!imgBusy}
                    data-testid="entry-image-regen-button"
                    className="btn-press inline-flex items-center gap-2 bg-[#D96C4A]/95 backdrop-blur-sm hover:bg-[#C05A3A] text-white rounded-full px-4 py-2 text-sm font-semibold shadow-md transition-all disabled:opacity-60"
                    title="Generate a new dish photo"
                  >
                    {imgBusy === "regen" ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Sparkles size={14} />}
                    {imgBusy === "regen" ? "Painting…" : "Regenerate"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div className="min-w-0">
                <p className="uppercase tracking-[0.3em] text-xs text-[#8C857B] mb-2">From {entry.created_by_name}</p>
                <h1 data-testid="entry-detail-title" className="font-display text-4xl sm:text-5xl text-[#2C302B] leading-tight">{entry.title}</h1>
              </div>
              <div className="flex gap-2 flex-wrap" data-print-hide>
                <button
                  data-testid="print-entry-button"
                  onClick={() => window.print()}
                  className="btn-press inline-flex items-center gap-2 bg-white border-2 border-[#8C857B]/20 text-[#2C302B] rounded-full px-5 py-2.5 font-semibold hover:border-[#5B7053]/50 hover:bg-[#F6F3EB] transition-all"
                  title="Print this entry"
                >
                  <Printer size={16} /> Print
                </button>
                <button
                  type="button"
                  data-testid="share-whatsapp-button"
                  onClick={handleWhatsAppShare}
                  className="btn-press inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-full px-5 py-2.5 font-semibold shadow-sm transition-all"
                  title="Share on WhatsApp"
                >
                  <WhatsAppIcon size={16} /> WhatsApp
                </button>
                {canEdit && (
                  <>
                    <button data-testid="edit-entry-button" onClick={() => navigate(`/entries/${id}/edit`)}
                      className="btn-press inline-flex items-center gap-2 bg-white border-2 border-[#8C857B]/20 text-[#2C302B] rounded-full px-5 py-2.5 font-semibold hover:border-[#D96C4A]/50 hover:bg-[#F6F3EB] transition-all">
                      <Pencil size={16} /> Edit
                    </button>
                    <button data-testid="delete-entry-button" onClick={() => setConfirming(true)}
                      className="btn-press inline-flex items-center gap-2 bg-white border-2 border-[#B54A4A]/30 text-[#B54A4A] rounded-full px-5 py-2.5 font-semibold hover:bg-[#B54A4A]/10 transition-all">
                      <Trash2 size={16} /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {entry.description && (
              <p className="text-[#5B6359] text-lg leading-relaxed mb-8 max-w-2xl">{entry.description}</p>
            )}

            <div className="flex flex-wrap gap-3 sm:gap-4 text-sm text-[#5B6359] mb-10" data-testid="entry-meta-row">
              <EditablePill
                label="Prep" icon={<Clock size={16} />} value={entry.prep_time}
                editing={editingField === "prep_time"} editValue={editValue} setEditValue={setEditValue}
                onStart={() => startEdit("prep_time")} onSave={saveEdit} onCancel={cancelEdit}
                placeholder="20 minutes" canEdit={canEdit} testId="prep-pill"
              />
              <EditablePill
                label="Cook" icon={<Clock size={16} />} value={entry.cook_time}
                editing={editingField === "cook_time"} editValue={editValue} setEditValue={setEditValue}
                onStart={() => startEdit("cook_time")} onSave={saveEdit} onCancel={cancelEdit}
                placeholder="45 minutes" canEdit={canEdit} testId="cook-pill"
              />
              <EditablePill
                label="" icon={<Users size={16} />} value={entry.servings}
                editing={editingField === "servings"} editValue={editValue} setEditValue={setEditValue}
                onStart={() => startEdit("servings")} onSave={saveEdit} onCancel={cancelEdit}
                placeholder="Serves 4" addLabel="Add servings" canEdit={canEdit} testId="servings-pill"
              />
              <span className="inline-flex items-center gap-2 bg-[#F6F3EB] rounded-full px-4 py-2"><ChefHat size={16} /> {entry.created_by_name}</span>
            </div>

            {audioSrc && (
              <div data-print-hide className="mb-10 bg-[#F6F3EB] rounded-3xl p-5 border border-[#8C857B]/15">
                <p className="text-xs uppercase tracking-[0.3em] text-[#8C857B] mb-3">In {entry.created_by_name}'s voice</p>
                <audio
                  ref={audioRef} data-testid="entry-audio" src={audioSrc} controls preload="metadata"
                  className="w-full"
                />
              </div>
            )}

            <div data-print-grid className="grid md:grid-cols-5 gap-10">
              <section className="md:col-span-2 space-y-6">
                {/* Recipe-only: Ingredients */}
                {entry.entry_type === "recipe" && (
                  <div>
                    <h2 className="font-display text-2xl text-[#2C302B] mb-4">Ingredients</h2>
                    <ul data-testid="entry-ingredients" className="space-y-2">
                      {(entry.ingredients || []).map((ing, i) => (
                        <li key={i} className="flex items-start gap-3 text-[#2C302B] leading-relaxed">
                          <span className="mt-2 block w-1.5 h-1.5 rounded-full bg-[#D96C4A] flex-shrink-0" />
                          <span>{ing}</span>
                        </li>
                      ))}
                      {(!entry.ingredients || entry.ingredients.length === 0) && (
                        <li className="text-[#8C857B] italic">No ingredients listed.</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Ritual / Festival: items needed + occasion */}
                {(entry.entry_type === "ritual" || entry.entry_type === "festival") && (
                  <>
                    {(entry.occasion || entry.time_of_year || entry.participants) && (
                      <div data-testid="entry-occasion" className="bg-[#F6F3EB] rounded-2xl p-5 border border-[#8C857B]/15 space-y-2 text-sm">
                        {entry.occasion && <div><span className="text-[#8C857B] uppercase text-xs tracking-wide font-semibold">Occasion</span><div className="text-[#2C302B]">{entry.occasion}</div></div>}
                        {entry.time_of_year && <div><span className="text-[#8C857B] uppercase text-xs tracking-wide font-semibold">When</span><div className="text-[#2C302B]">{entry.time_of_year}</div></div>}
                        {entry.participants && <div><span className="text-[#8C857B] uppercase text-xs tracking-wide font-semibold">Who performs it</span><div className="text-[#2C302B]">{entry.participants}</div></div>}
                      </div>
                    )}
                    {entry.items_needed && entry.items_needed.length > 0 && (
                      <div>
                        <h2 className="font-display text-2xl text-[#2C302B] mb-4">Items needed</h2>
                        <ul data-testid="entry-items-needed" className="space-y-2">
                          {entry.items_needed.map((it, i) => (
                            <li key={i} className="flex items-start gap-3 text-[#2C302B] leading-relaxed">
                              <span className="mt-2 block w-1.5 h-1.5 rounded-full bg-[#D96C4A] flex-shrink-0" />
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entry.significance && (
                      <div data-testid="entry-significance" className="bg-[#FFF7EC] border border-[#D9A05B]/30 rounded-2xl p-5">
                        <h3 className="font-display text-lg text-[#2C302B] mb-2">Significance</h3>
                        <p className="text-sm text-[#5B6359] leading-relaxed">{entry.significance}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Song / blessing: lyrics in original + English */}
                {entry.entry_type === "song" && (
                  <>
                    {(entry.occasion || entry.when_sung || entry.language) && (
                      <div data-testid="entry-song-meta" className="bg-[#F6F3EB] rounded-2xl p-5 border border-[#8C857B]/15 space-y-2 text-sm">
                        {entry.language && <div><span className="text-[#8C857B] uppercase text-xs tracking-wide font-semibold">Language</span><div className="text-[#2C302B]">{entry.language}</div></div>}
                        {entry.occasion && <div><span className="text-[#8C857B] uppercase text-xs tracking-wide font-semibold">Occasion</span><div className="text-[#2C302B]">{entry.occasion}</div></div>}
                        {entry.when_sung && <div><span className="text-[#8C857B] uppercase text-xs tracking-wide font-semibold">Sung</span><div className="text-[#2C302B]">{entry.when_sung}</div></div>}
                      </div>
                    )}
                  </>
                )}
              </section>
              <section className="md:col-span-3 space-y-8">
                {/* Song lyrics — full width, original + translation */}
                {entry.entry_type === "song" && (entry.lyrics_original || entry.lyrics_english) && (
                  <div className="grid gap-6">
                    {entry.lyrics_original && (
                      <div data-testid="entry-lyrics-original">
                        <h2 className="font-display text-2xl text-[#2C302B] mb-3">In its own language</h2>
                        <p className="text-[#2C302B] leading-loose whitespace-pre-line bg-[#FFF7EC] border border-[#D9A05B]/30 rounded-2xl p-5">{entry.lyrics_original}</p>
                      </div>
                    )}
                    {entry.lyrics_english && (
                      <div data-testid="entry-lyrics-english">
                        <h2 className="font-display text-2xl text-[#2C302B] mb-3">In English</h2>
                        <p className="text-[#2C302B] leading-loose whitespace-pre-line bg-[#F6F3EB] border border-[#8C857B]/15 rounded-2xl p-5">{entry.lyrics_english}</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h2 className="font-display text-2xl text-[#2C302B] mb-4">
                    {entry.entry_type === "recipe" ? "How to make it"
                      : entry.entry_type === "ritual" ? "How it's performed"
                      : entry.entry_type === "festival" ? "How we celebrate it"
                      : entry.entry_type === "song" ? "How it goes"
                      : "Steps"}
                  </h2>
                  <ol data-testid="entry-steps" className="space-y-4">
                    {(entry.steps || []).map((stepRaw, i) => {
                      const step = typeof stepRaw === "string" ? { text: stepRaw } : stepRaw;
                      return (
                        <li key={i} className="flex gap-3 sm:gap-4">
                          <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[#D96C4A] text-white font-display flex items-center justify-center">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#2C302B] leading-relaxed pt-1">{step.text}</p>
                        </div>
                      </li>
                    );
                  })}
                    {(!entry.steps || entry.steps.length === 0) && (
                      <li className="text-[#8C857B] italic">No steps yet.</li>
                    )}
                  </ol>
                </div>
              </section>
            </div>

            {entry.notes && (
              <section className="mt-10 bg-[#F6F3EB] rounded-3xl p-6 border border-[#8C857B]/15">
                <h3 className="font-display text-xl text-[#2C302B] mb-2">Family notes</h3>
                <p className="text-[#5B6359] leading-relaxed whitespace-pre-wrap">{entry.notes}</p>
              </section>
            )}

            <section data-testid="comments-section" data-print-hide className="mt-12">
              <div className="flex items-center gap-2 mb-5">
                <MessageCircle size={20} className="text-[#D96C4A]" />
                <h2 className="font-display text-2xl text-[#2C302B]">
                  Family chatter {comments.length > 0 && <span className="text-[#8C857B] text-base">({comments.length})</span>}
                </h2>
              </div>

              <div className="space-y-3 mb-6">
                {comments.length === 0 && (
                  <p className="text-sm text-[#8C857B] italic bg-[#F6F3EB] rounded-2xl px-5 py-4 border border-[#8C857B]/15">
                    No comments yet — be the first to share a memory or a tip.
                  </p>
                )}
                {comments.map((c) => (
                  <div key={c.comment_id} data-testid="comment-item" className="bg-[#F6F3EB] rounded-2xl px-5 py-4 border border-[#8C857B]/15">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#5B7053] text-white text-xs font-bold flex items-center justify-center">
                          {(c.user_name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#2C302B] text-sm truncate">{c.user_name}</p>
                          <p className="text-[11px] text-[#8C857B]">{new Date(c.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      {(book?.my_role === "owner" || user?.user_id === c.user_id) && (
                        <button data-testid="delete-comment-button" onClick={() => deleteComment(c.comment_id)}
                          className="btn-press text-[#8C857B] hover:text-[#B54A4A] transition-colors" title="Delete comment">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-[#2C302B] leading-relaxed mt-2 whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={submitComment} className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment, a memory, or a tip…" data-testid="comment-input"
                  className="flex-1 bg-white border-2 border-[#8C857B]/20 rounded-full px-5 py-3 text-[#2C302B] focus:border-[#D96C4A] focus:ring-4 focus:ring-[#D96C4A]/20 outline-none transition-all placeholder:text-[#8C857B]"
                />
                <button type="submit" data-testid="comment-submit-button" disabled={commentBusy || !commentText.trim()}
                  className="btn-press inline-flex items-center justify-center gap-2 bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-6 py-3 font-semibold transition-all shadow-sm disabled:opacity-50">
                  <Send size={16} /> Send
                </button>
              </form>
            </section>
          </article>
        )}

        {confirming && (
          <div data-testid="delete-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C302B]/50 px-4">
            <div className="bg-[#FDFBF7] rounded-3xl max-w-sm w-full p-8 border border-[#8C857B]/15 shadow-2xl">
              <h3 className="font-display text-2xl text-[#2C302B] mb-2">Remove this entry?</h3>
              <p className="text-[#5B6359] leading-relaxed">This will take it out of the vault for everyone.</p>
              <div className="flex gap-3 mt-6">
                <button data-testid="cancel-delete-button" onClick={() => setConfirming(false)}
                  className="btn-press flex-1 bg-white border-2 border-[#8C857B]/20 text-[#2C302B] rounded-full px-5 py-2.5 font-semibold hover:bg-[#F6F3EB] transition-all">Keep it</button>
                <button data-testid="confirm-delete-button" onClick={handleDelete}
                  className="btn-press flex-1 bg-[#B54A4A] hover:bg-[#993E3E] text-white rounded-full px-5 py-2.5 font-semibold transition-all">Remove</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EditablePill({ label, icon, value, editing, editValue, setEditValue, onStart, onSave, onCancel, placeholder, addLabel, canEdit, testId }) {
  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 bg-white border-2 border-[#D96C4A] rounded-full pl-4 pr-1 py-1" data-testid={`${testId}-edit`}>
        {icon}
        <input
          autoFocus
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onSave(); }
            else if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          }}
          placeholder={placeholder}
          className="bg-transparent text-[#2C302B] outline-none text-sm w-32 placeholder:text-[#8C857B]"
        />
        <button type="button" onClick={onSave} title="Save" className="btn-press w-7 h-7 rounded-full bg-[#5B7053] hover:bg-[#4a5c45] text-white flex items-center justify-center" data-testid={`${testId}-save`}>
          <Check size={14} />
        </button>
        <button type="button" onClick={onCancel} title="Cancel" className="btn-press w-7 h-7 rounded-full bg-[#F6F3EB] hover:bg-[#e7e2d6] text-[#5B6359] flex items-center justify-center">
          <X size={14} />
        </button>
      </span>
    );
  }
  if (value) {
    return (
      <button
        type="button"
        onClick={canEdit ? onStart : undefined}
        disabled={!canEdit}
        data-testid={testId}
        title={canEdit ? "Click to edit" : ""}
        className={`inline-flex items-center gap-2 bg-[#F6F3EB] rounded-full px-4 py-2 transition-all ${canEdit ? "hover:bg-[#ebe5d6] hover:ring-2 hover:ring-[#D96C4A]/30 cursor-pointer" : "cursor-default"}`}
      >
        {icon} {label && <span className="text-[#8C857B] font-medium">{label}</span>} {value}
      </button>
    );
  }
  if (canEdit) {
    return (
      <button
        type="button"
        onClick={onStart}
        data-testid={`${testId}-add`}
        className="btn-press inline-flex items-center gap-2 bg-white border-2 border-dashed border-[#8C857B]/30 hover:border-[#D96C4A]/50 hover:bg-[#F6F3EB] text-[#8C857B] hover:text-[#2C302B] rounded-full px-4 py-2 text-sm transition-all"
      >
        <Plus size={14} /> {addLabel || `Add ${label.toLowerCase()} ${label === "" ? "servings" : "time"}`.trim()}
      </button>
    );
  }
  return null;
}

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
