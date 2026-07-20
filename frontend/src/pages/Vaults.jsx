import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, formatApiError } from "@/context/AuthContext";
import * as appData from "@/lib/appData";
import Header from "@/components/Header";
import { BookHeart, PlusCircle, Users, Soup } from "lucide-react";

export default function Vaults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setBooks(await appData.listVaults(user));
    } catch {} finally { setLoading(false); }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const data = await appData.createVault(user, name);
      setName(""); setShowForm(false);
      navigate(`/vaults/${data.vault_id}`);
    } catch (err) {
      setError(formatApiError(err, "We couldn't create that vault."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <section className="mb-10 animate-fadeUp">
          <p className="uppercase tracking-[0.3em] text-xs text-[#8C857B] mb-3">Hi {user?.name?.split(" ")[0]}</p>
          <h1 className="font-display text-4xl sm:text-5xl text-[#2C302B] leading-tight">
            Your family <span className="text-[#D96C4A]">vaults</span>.
          </h1>
          <p className="mt-3 text-[#5B6359] max-w-xl leading-relaxed">
            A vault is a shared vault. Create one for your family, or open one you've been invited to.
          </p>
        </section>

        {!showForm ? (
          <button
            data-testid="new-vault-button"
            onClick={() => setShowForm(true)}
            className="btn-press inline-flex items-center gap-2 bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-6 py-3 font-semibold shadow-sm mb-8"
          >
            <PlusCircle size={18} /> Start a new vault
          </button>
        ) : (
          <form onSubmit={create} className="bg-[#F6F3EB] border border-[#8C857B]/15 rounded-3xl p-6 sm:p-8 mb-8 animate-fadeUp">
            <h2 className="font-display text-2xl text-[#2C302B] mb-2">Name your vault</h2>
            <p className="text-sm text-[#5B6359] mb-4">e.g. "The Patel Family", "Mom's recipes", "Christmas favorites"</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={name} onChange={(e) => setName(e.target.value)} required maxLength={80}
                placeholder="Our family vault" data-testid="new-vault-name-input"
                className="flex-1 bg-white border-2 border-[#8C857B]/20 rounded-full px-5 py-3 text-[#2C302B] focus:border-[#D96C4A] focus:ring-4 focus:ring-[#D96C4A]/20 outline-none transition-all placeholder:text-[#8C857B]"
              />
              <button
                type="submit" disabled={busy} data-testid="new-vault-submit-button"
                className="btn-press bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-6 py-3 font-semibold shadow-sm disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create"}
              </button>
              <button
                type="button" onClick={() => { setShowForm(false); setError(null); }}
                data-testid="new-vault-cancel-button"
                className="btn-press bg-white border-2 border-[#8C857B]/20 text-[#2C302B] rounded-full px-6 py-3 font-semibold hover:bg-[#F6F3EB] transition-all"
              >
                Cancel
              </button>
            </div>
            {error && <p data-testid="new-vault-error" className="text-sm text-[#B54A4A] mt-3">{error}</p>}
          </form>
        )}

        {loading ? (
          <div data-testid="vaults-loading" className="grid sm:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="bg-[#F6F3EB] rounded-3xl p-6 border border-[#8C857B]/15 animate-pulse">
                <div className="h-6 w-1/2 bg-[#8C857B]/20 rounded-full mb-3" />
                <div className="h-4 w-2/3 bg-[#8C857B]/15 rounded-full" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div data-testid="vaults-empty" className="bg-[#F6F3EB] rounded-3xl p-8 sm:p-14 border border-[#8C857B]/15 text-center">
            <BookHeart size={40} className="mx-auto text-[#D96C4A] mb-4" />
            <h2 className="font-display text-2xl sm:text-3xl text-[#2C302B] mb-3">No vaults yet</h2>
            <p className="text-[#5B6359] max-w-md mx-auto">
              Start your first family vault above — or wait for someone to invite you to theirs.
            </p>
          </div>
        ) : (
          <section data-testid="vaults-grid" className="grid sm:grid-cols-2 gap-6">
            {books.map((b, idx) => (
              <Link
                key={b.vault_id}
                to={`/vaults/${b.vault_id}`}
                data-testid="vault-card"
                className="card-hover block bg-[#F6F3EB] rounded-3xl p-6 border border-[#8C857B]/15 animate-fadeUp"
                style={{ animationDelay: `${Math.min(idx * 80, 320)}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="uppercase tracking-[0.3em] text-[10px] text-[#8C857B] mb-2">
                      {b.my_role === "owner" ? "You started this" : "You've been invited"}
                    </p>
                    <h3 data-testid="vault-card-name" className="font-display text-2xl sm:text-3xl text-[#2C302B] leading-tight">
                      {b.name}
                    </h3>
                  </div>
                  <BookHeart size={28} className="text-[#D96C4A] mt-1 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-5 mt-5 text-sm text-[#5B6359]">
                  <span className="inline-flex items-center gap-2"><Soup size={16} /> {b.recipe_count} {b.recipe_count === 1 ? "recipe" : "recipes"}</span>
                  <span className="inline-flex items-center gap-2"><Users size={16} /> {b.member_count} {b.member_count === 1 ? "member" : "members"}</span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
