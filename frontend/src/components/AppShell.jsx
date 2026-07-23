import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import {
  Home, Soup, BookOpen, Search, HelpCircle, Settings, ChevronDown, Menu, X, Mic, LogOut, User as UserIcon
} from 'lucide-react';
import { sidebarLinks, currentUser } from '../mock';
import api from '../api';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const iconMap = { Home, Soup, BookOpen, Search };

export default function AppShell({ children, active, onOpenRecord }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.listNotifications().then((d) => { if (!cancelled) setUnread(d?.unread || 0); }).catch((e) => console.error(e));
    return () => { cancelled = true; };
  }, [location.pathname]);

  useEffect(() => { setDrawer(false); }, [location.pathname]);

  const NavList = ({ onClick }) => (
    <nav className="px-3 pt-4 space-y-1">
      {sidebarLinks.map(item => {
        const Icon = iconMap[item.icon];
        const isActive = active ? active === item.key : location.pathname === item.path;
        return (
          <Link
            key={item.key}
            to={item.path}
            onClick={onClick}
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
  );

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-cream border-r border-neutral-200/70 flex-col fixed h-screen z-30">
        <div className="px-6 pt-6 pb-4"><Logo to="/app" /></div>
        <div className="flex-1 overflow-y-auto"><NavList /></div>
        <div className="px-3 pb-3">
          <Link to="/app/settings" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[15px] text-neutral-700 hover:bg-[#F5EDDD] ${location.pathname === '/app/settings' ? 'bg-[#F5EDDD]' : ''}`}>
            <Settings size={18} strokeWidth={1.8} /> Settings
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside onClick={e => e.stopPropagation()} className="absolute left-0 top-0 h-full w-72 bg-cream shadow-xl flex flex-col">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <Logo to="/app" />
              <button onClick={() => setDrawer(false)} className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto"><NavList onClick={() => setDrawer(false)} /></div>
            <div className="px-3 pb-4">
              <Link to="/app/settings" onClick={() => setDrawer(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-[15px] text-neutral-700 hover:bg-[#F5EDDD]">
                <Settings size={18} strokeWidth={1.8} /> Settings
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-cream/95 backdrop-blur border-b border-neutral-200/70">
          <div className="px-4 lg:px-8 py-3 flex items-center gap-3">
            <button className="lg:hidden w-10 h-10 rounded-full hover:bg-neutral-100 flex items-center justify-center" onClick={() => setDrawer(true)} aria-label="Menu"><Menu size={20} /></button>
            <div className="lg:hidden"><Logo to="/app" size="sm" /></div>
            <div className="hidden lg:block flex-1 relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Search recipes, stories, members…"
                onFocus={() => navigate('/app/search')}
                className="w-full bg-white border border-neutral-200 rounded-xl pl-11 pr-4 py-2.5 text-[14px] placeholder:text-neutral-400 focus:outline-none focus:border-cumin-green transition-colors"
              />
            </div>
            <div className="flex-1 lg:hidden" />
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/contact" data-testid="help-button" aria-label="Help & support" className="hidden lg:flex w-10 h-10 rounded-full hover:bg-neutral-100 items-center justify-center">
                    <HelpCircle size={19} className="text-neutral-700" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[12px]">Help &amp; support</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-trigger" className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-neutral-100 transition-colors">
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover" />
                  <span className="hidden lg:inline text-[14px] font-medium text-neutral-800">{currentUser.name}</span>
                  <ChevronDown size={15} className="hidden lg:inline text-neutral-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-[13px] font-semibold text-neutral-900">{currentUser.name}</div>
                  <div className="text-[11.5px] text-neutral-500 font-normal">{currentUser.email || 'meera.rao@family.com'}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/app/settings')} data-testid="user-menu-account">
                  <UserIcon size={14} className="mr-2" /> Account settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/contact')}>
                  <HelpCircle size={14} className="mr-2" /> Help &amp; support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    try { await api.authLogout(); } catch { /* ignore */ }
                    try {
                      localStorage.removeItem('cuminjar_verified_email');
                      localStorage.removeItem('cuminjar_active_family');
                      localStorage.removeItem('cuminjar_user');
                    } catch { /* ignore */ }
                    navigate('/login');
                  }}
                  data-testid="user-menu-logout"
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut size={14} className="mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main>{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-neutral-200/70">
        <div className="grid grid-cols-5 items-center">
          {sidebarLinks.slice(0, 2).map(item => {
            const Icon = iconMap[item.icon];
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.key} to={item.path} className={`flex flex-col items-center py-2 text-[11px] ${isActive ? 'text-terracotta font-semibold' : 'text-neutral-500'}`}>
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
          {/* Central record FAB */}
          <button onClick={() => onOpenRecord && onOpenRecord()} className="flex flex-col items-center -mt-4">
            <span className="w-14 h-14 rounded-full bg-cumin-green text-white flex items-center justify-center shadow-lg">
              <Mic size={22} />
            </span>
            <span className="text-[10px] text-cumin-green font-semibold mt-0.5">Record</span>
          </button>
          {sidebarLinks.slice(2).map(item => {
            const Icon = iconMap[item.icon];
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.key} to={item.path} className={`flex flex-col items-center py-2 text-[11px] ${isActive ? 'text-terracotta font-semibold' : 'text-neutral-500'}`}>
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
