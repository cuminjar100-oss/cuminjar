import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth, formatApiError } from "@/context/AuthContext";
import * as appData from "@/lib/appData";
import Header from "@/components/Header";
import { ArrowLeft, Save, Plus, X } from "lucide-react";

const empty = {
  title: "", description: "", image_url: "", prep_time: "", cook_time: "", servings: "", notes: "",
  ingredients: [""], steps: [""],
};

export default function EntryForm({ mode = "create" }) {
  const { id, vaultId: vaultIdParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vaultId, setVaultId] = useState(vaultIdParam || null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mode !== "edit" || !user) return;
    let mounted = true;
    (async () => {
      try {
        const data = await appData.getEntry(user, id);
        if (!mounted) return;
        setVaultId(data.vault_id);
        setForm({
          title: data.title || "", description: data.description || "",
          image_url: data.image_url || "", prep_time: data.prep_time || "",
          cook_time: data.cook_time || "",
          servings: data.servings || "", notes: data.notes || "",
          ingredients: data.ingredients?.length ? data.ingredients : [""],
          steps: data.steps?.length ? data.steps.map((s) => (typeof s === "string" ? s : s?.text || "")) : [""],
        });
      } catch (e) {
        if (mounted) setError(formatApiError(e, "We couldn't load that entry."));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [mode, id, user]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const updateList = (key, idx, v) => setForm((f) => { const n = [...f[key]]; n[idx] = v; return { ...f, [key]: n }; });
  const addItem = (key) => setForm((f) => ({ ...f, [key]: [...f[key], ""] }));
  const removeItem = (key, idx) => setForm((f) => { const n = f[key].filter((_, i) => i !== idx); return { ...f, [key]: n.length ? n : [""] }; });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) return setError("Every entry needs a name.");
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      image_url: form.image_url.trim() || null,
      prep_time: form.prep_time.trim() || null,
      cook_time: form.cook_time.trim() || null,
      servings: form.servings.trim() || null,
      notes: form.notes.trim(),
      ingredients: form.ingredients.map((s) => s.trim()).filter(Boolean),
      steps: form.steps.map((s) => s.trim()).filter(Boolean).map((text) => ({ text, start_time: null, end_time: null })),
    };
    try {
      if (mode === "edit") {
        const data = await appData.updateEntry(user, id, payload);
        navigate(`/entries/${data.entry_id}`, { replace: true });
      } else {
        const data = await appData.createEntry(user, vaultId, payload);
        navigate(`/entries/${data.entry_id}`, { replace: true });
      }
    } catch (err) {
      setError(formatApiError(err, "We couldn't save that entry."));
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
        <Link
          to={mode === "edit" ? `/entries/${id}` : `/vaults/${vaultId}`}
          data-testid="form-back-link"
          className="inline-flex items-center gap-2 text-[#5B6359] hover:text-[#D96C4A] transition-colors mb-6"
        >
          <ArrowLeft size={18} /> Back
        </Link>

        <header className="mb-8 animate-fadeUp">
          <p className="uppercase tracking-[0.3em] text-xs text-[#8C857B] mb-2">
            {mode === "edit" ? "Polish the memory" : "Type a entry"}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-[#2C302B] leading-tight">
            {mode === "edit" ? "Edit entry" : "Add a entry"}
          </h1>
        </header>

        {loading ? (
          <div data-testid="form-loading" className="animate-pulse bg-[#F6F3EB] rounded-3xl p-8 border border-[#8C857B]/15 h-64" />
        ) : (
          <form onSubmit={handleSubmit} data-testid="entry-form" className="space-y-8 animate-fadeUp">
            {error && (
              <div data-testid="form-error" className="bg-[#B54A4A]/10 border-2 border-[#B54A4A]/30 text-[#B54A4A] rounded-2xl px-5 py-3">{error}</div>
            )}

            <Section title="The basics">
              <Field label="Entry name" required>
                <input data-testid="entry-title-input" type="text" value={form.title}
                  onChange={(e) => update("title", e.target.value)} placeholder="Grandma Rose's sourdough" className={inputCls} />
              </Field>
              <Field label="A short description">
                <textarea data-testid="entry-description-input" value={form.description}
                  onChange={(e) => update("description", e.target.value)} placeholder="A story, a memory, or how it tastes…" className={textareaCls} />
              </Field>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Prep time">
                  <input data-testid="entry-prep-input" type="text" value={form.prep_time}
                    onChange={(e) => update("prep_time", e.target.value)} placeholder="20 minutes" className={inputCls} />
                </Field>
                <Field label="Cook time">
                  <input data-testid="entry-cook-input" type="text" value={form.cook_time}
                    onChange={(e) => update("cook_time", e.target.value)} placeholder="45 minutes" className={inputCls} />
                </Field>
                <Field label="Servings">
                  <input data-testid="entry-servings-input" type="text" value={form.servings}
                    onChange={(e) => update("servings", e.target.value)} placeholder="Serves 4" className={inputCls} />
                </Field>
              </div>
              <Field label="Photo URL (leave blank — we'll auto-generate one)">
                <input data-testid="entry-image-input" type="url" value={form.image_url}
                  onChange={(e) => update("image_url", e.target.value)} placeholder="https://… (optional)" className={inputCls} />
              </Field>
            </Section>

            <Section title="Ingredients">
              <div className="space-y-3">
                {form.ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input data-testid={`ingredient-input-${i}`} type="text" value={ing}
                      onChange={(e) => updateList("ingredients", i, e.target.value)}
                      placeholder={`Ingredient ${i + 1}`} className={inputCls} />
                    <button type="button" onClick={() => removeItem("ingredients", i)}
                      className="btn-press w-11 h-11 flex-shrink-0 rounded-2xl border-2 border-[#8C857B]/20 text-[#8C857B] hover:text-[#B54A4A] hover:border-[#B54A4A]/40 flex items-center justify-center transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button type="button" data-testid="add-ingredient-button" onClick={() => addItem("ingredients")}
                  className="btn-press inline-flex items-center gap-2 text-[#D96C4A] hover:text-[#C05A3A] font-semibold">
                  <Plus size={16} /> Add another ingredient
                </button>
              </div>
            </Section>

            <Section title="Steps">
              <div className="space-y-3">
                {form.steps.map((s, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="mt-3 flex-shrink-0 w-8 h-8 rounded-full bg-[#D96C4A] text-white font-display flex items-center justify-center">{i + 1}</span>
                    <textarea data-testid={`step-input-${i}`} value={s} onChange={(e) => updateList("steps", i, e.target.value)}
                      placeholder={`Step ${i + 1}`} className={`${textareaCls} min-h-[80px]`} />
                    <button type="button" onClick={() => removeItem("steps", i)}
                      className="mt-2 btn-press w-11 h-11 flex-shrink-0 rounded-2xl border-2 border-[#8C857B]/20 text-[#8C857B] hover:text-[#B54A4A] hover:border-[#B54A4A]/40 flex items-center justify-center transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button type="button" data-testid="add-step-button" onClick={() => addItem("steps")}
                  className="btn-press inline-flex items-center gap-2 text-[#D96C4A] hover:text-[#C05A3A] font-semibold">
                  <Plus size={16} /> Add another step
                </button>
              </div>
            </Section>

            <Section title="Family notes (optional)">
              <textarea data-testid="entry-notes-input" value={form.notes}
                onChange={(e) => update("notes", e.target.value)} placeholder="Substitutions, stories…"
                className={`${textareaCls} min-h-[120px]`} />
            </Section>

            <div className="flex flex-wrap gap-3 justify-end pt-4 pb-12">
              <button type="button" data-testid="cancel-form-button"
                onClick={() => navigate(mode === "edit" ? `/entries/${id}` : `/vaults/${vaultId}`)}
                className="btn-press bg-white border-2 border-[#8C857B]/20 text-[#2C302B] rounded-full px-7 py-3 font-semibold hover:bg-[#F6F3EB] transition-all">
                Cancel
              </button>
              <button type="submit" data-testid="save-entry-button" disabled={saving}
                className="btn-press inline-flex items-center gap-2 bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-7 py-3 font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
                <Save size={18} /> {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Save entry"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-[#F6F3EB] rounded-3xl p-6 sm:p-8 border border-[#8C857B]/15">
      <h2 className="font-display text-2xl text-[#2C302B] mb-5">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-[#8C857B] font-semibold mb-2">
        {label} {required && <span className="text-[#D96C4A]">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls = "w-full bg-white border-2 border-[#8C857B]/20 rounded-2xl px-5 py-3 text-[#2C302B] focus:border-[#D96C4A] focus:ring-4 focus:ring-[#D96C4A]/20 outline-none transition-all placeholder:text-[#8C857B]";
const textareaCls = "w-full bg-white border-2 border-[#8C857B]/20 rounded-2xl px-5 py-3 text-[#2C302B] focus:border-[#D96C4A] focus:ring-4 focus:ring-[#D96C4A]/20 outline-none transition-all placeholder:text-[#8C857B] min-h-[100px] resize-y";
