import React, { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import { Plus, Images as ImagesIcon, Loader2, X } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/use-toast';

export default function AlbumsPage() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setAlbums(await api.listAlbums()); } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <AppShell active="albums">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Albums</h1>
            <p className="text-neutral-500 text-[14px] mt-1">Your family’s memories, gathered in one place.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-cumin-green text-white px-4 py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#324A2F] transition-colors"><Plus size={15} /> New Album</button>
        </div>

        {loading ? (
          <div className="mt-12 flex justify-center"><Loader2 className="animate-spin text-neutral-500" size={22} /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {albums.map(a => (
              <div key={a.id} className="bg-white rounded-2xl border border-neutral-200/70 overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
                  {a.cover && <img src={a.cover} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                </div>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif-display text-[19px] font-semibold text-neutral-900">{a.title}</h3>
                    <p className="text-[12.5px] text-neutral-500 mt-0.5 flex items-center gap-1"><ImagesIcon size={12} /> {a.count || 0} items</p>
                  </div>
                </div>
              </div>
            ))}
            {albums.length === 0 && <div className="col-span-full text-center py-12 text-neutral-500">No albums yet.</div>}
          </div>
        )}
      </div>

      {showModal && (
        <NewAlbumModal onClose={() => setShowModal(false)} onSaved={(a) => { setAlbums(prev => [a, ...prev]); setShowModal(false); toast({ title: 'Album created' }); }} />
      )}
    </AppShell>
  );
}

function NewAlbumModal({ onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [cover, setCover] = useState('');
  const [saving, setSaving] = useState(false);
  const handleFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCover(reader.result);
    reader.readAsDataURL(f);
  };
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { onSaved(await api.createAlbum({ title, cover: cover || null })); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif-display text-[24px] font-semibold">New album</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <input required placeholder="Album title" value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green" autoFocus />
          <label className="flex items-center gap-3 border border-dashed border-neutral-300 rounded-lg px-3 py-3 cursor-pointer text-[13.5px] text-neutral-600">
            {cover ? <img src={cover} alt="cover" className="w-14 h-14 rounded object-cover" /> : <div className="w-14 h-14 rounded bg-neutral-100" />}
            <span>Upload cover photo</span>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        </div>
        <button disabled={saving} type="submit" className="w-full mt-5 bg-cumin-green text-white py-3 rounded-lg font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
          {saving && <Loader2 size={15} className="animate-spin" />} Create Album
        </button>
      </form>
    </div>
  );
}
