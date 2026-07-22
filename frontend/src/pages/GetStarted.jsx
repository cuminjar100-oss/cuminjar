import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function GetStarted() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const submit = (e) => { e.preventDefault(); navigate('/app'); };
  return (
    <div className="min-h-screen bg-cream grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-center px-16 py-10 bg-[#F3EBDC]">
        <Logo />
        <div className="mt-14 max-w-md">
          <h2 className="font-serif-display text-[36px] font-semibold text-neutral-900 leading-tight">Preserve your family’s flavors, forever.</h2>
          <p className="mt-4 text-neutral-700 text-[15px]">Join 1,000+ families using CuminJar to record voice recipes, save handwritten notes, and pass down traditions.</p>
          <ul className="mt-8 space-y-3 text-neutral-700">
            {['Free to start — no credit card', 'Private & secure family space', 'Works in 12 languages', 'Cancel anytime'].map(x => (
              <li key={x} className="flex items-center gap-2 text-[14.5px]"><CheckCircle2 size={17} className="text-cumin-green" /> {x}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col justify-center px-8 md:px-16 py-10">
        <div className="md:hidden"><Logo /></div>
        <div className="mt-6 max-w-md w-full">
          <h1 className="font-serif-display text-[38px] font-semibold text-neutral-900">Create your account</h1>
          <p className="text-neutral-600 mt-2">Start free. Set up your family jar in minutes.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-[13px] font-semibold text-neutral-800">Your Name</span>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
                <input type="text" required className="w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-3 py-3 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" placeholder="Meera Rao" />
              </div>
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-neutral-800">Email</span>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
                <input type="email" required className="w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-3 py-3 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" placeholder="you@family.com" />
              </div>
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-neutral-800">Password</span>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
                <input type={show ? 'text' : 'password'} required className="w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-10 py-3 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" placeholder="Create a password" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <button type="submit" className="w-full bg-cumin-green text-white py-3.5 rounded-lg font-medium hover:bg-[#324A2F] transition-colors">Create Family Account</button>

            <p className="text-[12px] text-neutral-500 text-center">By continuing, you agree to CuminJar’s Terms and Privacy Policy.</p>
            <p className="text-center text-[13.5px] text-neutral-600">
              Already have an account? <Link to="/login" className="text-cumin-green font-semibold hover:underline">Log in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
