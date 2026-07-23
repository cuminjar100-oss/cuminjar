import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { Instagram, Twitter, Youtube, Mail } from 'lucide-react';

export default function MarketingFooter() {
  return (
    <footer className="bg-[#F3EBDC] border-t border-neutral-200/60 mt-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 text-[15px] text-neutral-600 leading-relaxed max-w-sm">
            Preserve family recipes, stories & traditions in their voice. Because every family deserves a jar full of memories.
          </p>
          <div className="flex items-center gap-4 mt-6 text-neutral-500">
            <a href="#" className="hover:text-cumin-green transition-colors" aria-label="Instagram"><Instagram size={20} /></a>
            <a href="#" className="hover:text-cumin-green transition-colors" aria-label="Twitter"><Twitter size={20} /></a>
            <a href="#" className="hover:text-cumin-green transition-colors" aria-label="YouTube"><Youtube size={20} /></a>
            <a href="#" className="hover:text-cumin-green transition-colors" aria-label="Email"><Mail size={20} /></a>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-neutral-900 mb-4">Product</h4>
          <ul className="space-y-2 text-[14px] text-neutral-600">
            <li><Link to="/features" className="hover:text-cumin-green">Features</Link></li>
            <li><Link to="/how-it-works" className="hover:text-cumin-green">How it works</Link></li>
            <li><Link to="/pricing" className="hover:text-cumin-green">Pricing</Link></li>
            <li><Link to="/stories" className="hover:text-cumin-green">Stories</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-neutral-900 mb-4">Company</h4>
          <ul className="space-y-2 text-[14px] text-neutral-600">
            <li><Link to="/about" className="hover:text-cumin-green">About us</Link></li>
            <li><Link to="/contact" className="hover:text-cumin-green">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-neutral-900 mb-4">Legal</h4>
          <ul className="space-y-2 text-[14px] text-neutral-600">
            <li><Link to="/privacy" className="hover:text-cumin-green">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-cumin-green">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex flex-col md:flex-row justify-between items-center gap-3 text-[13px] text-neutral-500">
          <p>© {new Date().getFullYear()} CuminJar. Made with love, for families.</p>
          <p>Bengaluru · San Jose · Toronto</p>
        </div>
      </div>
    </footer>
  );
}
