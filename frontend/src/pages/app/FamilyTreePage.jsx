import React, { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import { Plus, Loader2, X } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/use-toast';
import { familyAvatars } from '../../mock';

export default function FamilyTreePage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setMembers(await api.getFamilyTree()); } catch (e) {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const grouped = [0, 1, 2, 3].map(lv => ({ level: lv, members: members.filter(m => m.level === lv) })).filter(g => g.members.length > 0);

  return (
    <AppShell active="tree">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Family Tree</h1>
            <p className="text-neutral-500 text-[14px] mt-1">See your family’s legacy, generation by generation.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-cumin-green text-white px-4 py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#324A2F] transition-colors"><Plus size={15} /> Add Member</button>
        </div>

        {loading ? (
          <div className="mt-12 flex justify-center"><Loader2 className="animate-spin text-neutral-500" size={22} /></div>
        ) : (
          <div className="mt-10 bg-[#FBF6EE] rounded-3xl border border-neutral-200/70 p-10">
            <div className="space-y-14">
              {grouped.map((row, ri) => (
                <div key={row.level} className="relative">
                  <div className="flex items-center justify-center gap-16 flex-wrap">
                    {row.members.map(m => (
                      <div key={m.id} className="flex flex-col items-center bg-white rounded-2xl border border-neutral-200/70 px-5 py-4 min-w-[180px]">
                        <img src={m.avatar || familyAvatars[0]} alt={m.name} className="w-16 h-16 rounded-full object-cover" />
                        <p className="font-semibold text-[14px] mt-3 text-neutral-900">{m.name}</p>
                        <p className="text-[12px] text-neutral-500">{m.role}</p>
                      </div>
                    ))}
                  </div>
                  {ri < grouped.length - 1 && <div className="w-px h-10 bg-neutral-300 mx-auto mt-4" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AddMemberModal onClose={() => setShowModal(false)} onSaved={(m) => { setMembers(prev => [...prev, m]); setShowModal(false); toast({ title: 'Member added' }); }} />
      )}
    </AppShell>
  );
}

function AddMemberModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', role: '', level: 2 });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { onSaved(await api.addFamilyMember({ ...form, level: Number(form.level), avatar: familyAvatars[Math.floor(Math.random() * familyAvatars.length)] })); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif-display text-[24px] font-semibold">Add family member</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <input required autoFocus placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green" />
          <input required placeholder="Role (e.g., Aunt, Cousin)" value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green" />
          <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green">
            <option value={0}>Grandparents generation</option>
            <option value={1}>Parents generation</option>
            <option value={2}>Your generation</option>
            <option value={3}>Children generation</option>
          </select>
        </div>
        <button disabled={saving} type="submit" className="w-full mt-5 bg-cumin-green text-white py-3 rounded-lg font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
          {saving && <Loader2 size={15} className="animate-spin" />} Add
        </button>
      </form>
    </div>
  );
}
