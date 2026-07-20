import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import * as appData from "@/lib/appData";
import { LogOut, UtensilsCrossed, Bell } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const popRef = useRef(null);

  const fetchNotifs = useCallback(async () => {
    try { setNotifs(await appData.listNotifications(user)); } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    return () => clearInterval(t);
  }, [user, fetchNotifs]);

  useEffect(() => {
    const onClick = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;
  const initials = (user.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const handleClick = async (n) => {
    try { await appData.markNotificationRead(user, n.notification_id); } catch {}
    setOpen(false);
    if (n.link) navigate(n.link);
    fetchNotifs();
  };

  const markAll = async () => { try { await appData.markAllNotificationsRead(user); } catch {} fetchNotifs(); };

  return (
    <header data-testid="app-header" className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#8C857B]/15 px-5 sm:px-8 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <Link to="/" data-testid="home-link" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-[#D96C4A] text-white flex items-center justify-center shadow-sm group-hover:rotate-[-6deg] transition-transform">
            <UtensilsCrossed size={20} strokeWidth={2.2} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-[#2C302B] text-xl sm:text-2xl">Mamascript</span>
            <span className="text-xs text-[#8C857B] tracking-wide uppercase">A vault we share</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <div className="relative" ref={popRef}>
            <button
              data-testid="notifications-button"
              onClick={() => { setOpen((o) => !o); if (!open) fetchNotifs(); }}
              className="btn-press relative w-10 h-10 rounded-full border border-[#8C857B]/20 text-[#2C302B] hover:bg-[#F6F3EB] flex items-center justify-center transition-all"
              title="Notifications"
            >
              <Bell size={18} />
              {notifs.unread > 0 && (
                <span data-testid="notifications-unread-badge" className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#D96C4A] text-white text-[10px] font-bold flex items-center justify-center">
                  {notifs.unread > 9 ? "9+" : notifs.unread}
                </span>
              )}
            </button>
            {open && (
              <div data-testid="notifications-popover" className="absolute right-0 mt-3 w-80 max-w-[90vw] bg-[#FDFBF7] rounded-2xl border border-[#8C857B]/20 shadow-[0_18px_40px_rgba(44,48,43,0.18)] overflow-hidden z-50">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#8C857B]/15">
                  <span className="font-display text-lg text-[#2C302B]">Notifications</span>
                  {notifs.unread > 0 && (
                    <button data-testid="mark-all-read-button" onClick={markAll} className="text-xs text-[#D96C4A] hover:text-[#C05A3A] font-semibold">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifs.items.length === 0 ? (
                    <div className="px-5 py-8 text-center text-[#8C857B] text-sm">Nothing yet — quiet kitchen.</div>
                  ) : (
                    notifs.items.map((n) => (
                      <button key={n.notification_id} data-testid="notification-item" onClick={() => handleClick(n)}
                        className={`w-full text-left px-5 py-3 hover:bg-[#F6F3EB] border-b border-[#8C857B]/10 transition-colors ${n.read ? "" : "bg-[#FFF6EC]"}`}>
                        <p className="text-sm text-[#2C302B] leading-snug">{n.message}</p>
                        <p className="text-[11px] text-[#8C857B] mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div data-testid="user-profile-badge" className="hidden sm:flex items-center gap-3 bg-[#F6F3EB] border border-[#8C857B]/15 rounded-full pl-2 pr-3 py-1.5">
            <div className="w-8 h-8 rounded-full bg-[#5B7053] text-white flex items-center justify-center text-xs font-bold">{initials}</div>
            <span className="text-sm font-semibold text-[#2C302B] max-w-[140px] truncate">{user.name}</span>
          </div>

          <button
            data-testid="logout-button"
            onClick={async () => { await logout(); navigate("/login"); }}
            title="Sign out"
            className="btn-press w-10 h-10 rounded-full border border-[#8C857B]/20 text-[#2C302B] hover:bg-[#F6F3EB] hover:border-[#D96C4A]/50 flex items-center justify-center transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
