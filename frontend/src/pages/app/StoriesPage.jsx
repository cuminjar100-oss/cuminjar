import React, { useState, useEffect, useCallback } from 'react';
import AppShell from '../../components/AppShell';
import { Play, Clock, Plus, X, Loader2 } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/use-toast';

export default function StoriesPage() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setStories(await api.listStories()); } catch (e) { toast({ title: 'Failed to load stories' }); }
    setLoading(false);
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  return (
    <AppShell active="stories">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Family Stories</h1>
            <p className="text-neutral-500 text-[14px] mt-1">Voices from your family jar.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-cumin-green text-white px-4 py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#324A2F] transition-colors"><Plus size={15} /> New Story</button>
        </div>

        {loading ? (
          <div className="mt-12 flex items-center justify-center text-neutral-500"><Loader2 className="animate-spin" size={22} /></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {stories.map(s => (
              <article key={s.id} className="bg-white rounded-2xl border border-neutral-200/70 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <button className="w-11 h-11 rounded-full bg-[#FBE3D2] flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform">
                    <Play size={14} className="text-terracotta ml-0.5" fill="currentColor" />
                  </button>
                  <div>
                    <h3 className="font-serif-display text-[22px] font-semibold text-neutral-900">{s.title}</h3>
                    <p className="text-[12px] text-neutral-500 mt-0.5">By {s.author}</p>
                    <p className="mt-3 text-[14px] text-neutral-700 leading-relaxed">{s.excerpt}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-[12px] text-neutral-500"><Clock size={12} /> {s.mins} min listen</div>
                  </div>
                </div>
              </article>
            ))}
            {stories.length === 0 && <div className="col-span-full text-center py-12 text-neutral-500">No stories yet.</div>}
          </div>
        )}
      </div>

      {showModal && (
        <AddStoryModal onClose={() => setShowModal(false)} onSaved={(s) => { setStories(prev => [s, ...prev]); setShowModal(false); toast({ title: 'Story saved!' }); }} />
      )}
    </AppShell>
  );
}

function AddStoryModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', author: '', excerpt: '', mins: 4 });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await api.createStory({ ...form, mins: Number(form.mins) || 4, author: form.author || 'You' });
      onSaved(saved);
    } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif-display text-[24px] font-semibold">New story</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <input required placeholder="Story title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green" />
          <input placeholder="Author" value={form.author} onChange={e => setForm({...form, author: e.target.value})} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green" />
          <textarea rows={5} required placeholder="Write your story…" value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green resize-none" />
          <div className="flex items-center gap-2">
            <label className="text-[13px] text-neutral-600">Listen time (mins):</label>
            <input type="number" min="1" value={form.mins} onChange={e => setForm({...form, mins: e.target.value})} className="w-20 border border-neutral-200 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-cumin-green" />
          </div>
        </div>
        <button disabled={saving} type="submit" className="w-full mt-5 bg-cumin-green text-white py-3 rounded-lg font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
          {saving && <Loader2 size={15} className="animate-spin" />} Save Story
        </button>
      </form>
    </div>
  );
}
