import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { Menu, X } from 'lucide-react';

const NAV = [
  { label: 'How it Works', to: '/how-it-works' },
  { label: 'Features', to: '/features' },
  { label: 'Stories', to: '/stories' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' }
];

export default function MarketingHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-cream/85 backdrop-blur-md border-b border-transparent">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-8">
          {NAV.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-[15px] transition-colors ${pathname === item.to ? 'text-cumin-green font-semibold' : 'text-neutral-700 hover:text-cumin-green'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="text-[15px] text-neutral-800 hover:text-cumin-green transition-colors">Log in</Link>
          <Link
            to="/get-started"
            className="bg-cumin-green text-white text-[15px] font-medium px-5 py-2.5 rounded-lg hover:bg-[#324A2F] transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Get Started
          </Link>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden text-neutral-800" aria-label="Menu">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-neutral-200 bg-cream px-6 py-4 space-y-3">
          {NAV.map(item => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className="block text-neutral-800">{item.label}</Link>
          ))}
          <Link to="/login" onClick={() => setOpen(false)} className="block text-neutral-800">Log in</Link>
          <Link to="/get-started" onClick={() => setOpen(false)} className="block bg-cumin-green text-white text-center py-2.5 rounded-lg">Get Started</Link>
        </div>
      )}
    </header>
  );
}
