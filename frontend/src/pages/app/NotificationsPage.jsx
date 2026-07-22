import React, { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';
import { Users, Mic, Sparkles, Heart, Loader2 } from 'lucide-react';
import api from '../../api';

const iconMap = { Users, Mic, Sparkles, Heart };
const tints = {
  Mic: { bg: 'bg-[#FBE3D2]', ic: 'text-terracotta' },
  Sparkles: { bg: 'bg-[#DFEAD8]', ic: 'text-[#5D7A4E]' },
  Users: { bg: 'bg-[#E4DEF4]', ic: 'text-[#7A6FB0]' },
  Heart: { bg: 'bg-[#F7D9DA]', ic: 'text-[#C25264]' },
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.listNotifications();
        setItems(data.items || []);
        await api.markAllRead();
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell active="">
      <div className="px-8 py-6 max-w-3xl">
        <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Notifications</h1>
        <p className="text-neutral-500 text-[14px] mt-1">Everything happening in your family jar.</p>

        {loading ? (
          <div className="mt-12 flex justify-center"><Loader2 className="animate-spin text-neutral-500" size={22} /></div>
        ) : (
          <div className="mt-8 space-y-3">
            {items.map((n) => {
              const Icon = iconMap[n.icon] || Sparkles;
              const tint = tints[n.icon] || tints.Sparkles;
              return (
                <div key={n.id} className="bg-white rounded-2xl border border-neutral-200/70 p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
                  <div className={`w-11 h-11 rounded-full ${tint.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={tint.ic} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[14.5px] text-neutral-900">{n.title}</p>
                    <p className="text-[13px] text-neutral-600 mt-0.5">{n.desc}</p>
                  </div>
                  <span className="text-[12px] text-neutral-400 flex-shrink-0">{n.when}</span>
                </div>
              );
            })}
            {items.length === 0 && <p className="text-center py-12 text-neutral-500">No notifications yet.</p>}
          </div>
        )}
      </div>
    </AppShell>
  );
}
