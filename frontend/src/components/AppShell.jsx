import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import {
  Home, Soup, BookOpen, Mic, Images, Network, Search, Bell, HelpCircle, Settings, ChevronDown, Smartphone
} from 'lucide-react';
import { sidebarLinks, currentUser } from '../mock';
import api from '../api';

const iconMap = { Home, Soup, BookOpen, Mic, Images, Network, Search };

export default function AppShell({ children, active }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.listNotifications().then((d) => { if (!cancelled) setUnread(d?.unread || 0); }).catch((e) => console.error(e));
    return () => { cancelled = true; };
  }, [location.pathname]);
  return (
    <div className="min-h-screen bg-cream flex">
      {/* Sidebar */}
      <aside className="w-64 bg-cream border-r border-neutral-200/70 flex flex-col fixed h-screen">
        <div className="px-6 pt-6 pb-4">
          <Logo to="/app" />
        </div>

        <nav className="flex-1 px-3 pt-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map(item => {
            const Icon = iconMap[item.icon];
            const isActive = active ? active === item.key : location.pathname === item.path;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[15px] transition-colors ${
                  isActive
                    ? 'bg-[#F1E8D8] text-terracotta font-semibold'
                    : 'text-neutral-700 hover:bg-[#F5EDDD] hover:text-neutral-900'
                }`}
              >
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-3 space-y-1">
          <Link
            to="/app/settings"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[15px] text-neutral-700 hover:bg-[#F5EDDD] transition-colors ${location.pathname === '/app/settings' ? 'bg-[#F5EDDD]' : ''}`}
          >
            <Settings size={18} strokeWidth={1.8} />
            Settings
          </Link>
        </div>

        <div className="mx-4 mb-4 rounded-2xl bg-[#F1E8D8] p-4">
          <div className="flex items-start gap-3">
            <Smartphone size={18} className="text-terracotta mt-1" />
            <div>
              <p className="font-semibold text-[13.5px] text-neutral-900">CuminJar Mobile</p>
              <p className="text-[12px] text-neutral-600 mt-1 leading-relaxed">Record, save and share memories on the go.</p>
              <button className="mt-2 text-[12px] font-semibold text-cumin-green underline underline-offset-2">Learn More</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur-md border-b border-neutral-200/70">
          <div className="px-8 py-4 flex items-center gap-6">
            <div className="flex-1 relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Search recipes, stories, members…"
                onFocus={() => navigate('/app/search')}
                className="w-full bg-white border border-neutral-200 rounded-xl pl-11 pr-14 py-2.5 text-[14px] placeholder:text-neutral-400 focus:outline-none focus:border-cumin-green transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">⌘ K</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/app/notifications" className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors">
                <Bell size={19} className="text-neutral-700" />
                {unread > 0 && <span className="absolute top-1 right-1 bg-terracotta text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium">{unread}</span>}
              </Link>
              <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors">
                <HelpCircle size={19} className="text-neutral-700" />
              </button>
              <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-neutral-100 transition-colors">
                <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover" />
                <span className="text-[14px] font-medium text-neutral-800">{currentUser.name}</span>
                <ChevronDown size={15} className="text-neutral-500" />
              </button>
            </div>
          </div>
        </header>

        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
