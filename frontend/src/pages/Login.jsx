import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { heroImages } from '../mock';

export default function Login() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const submit = (e) => { e.preventDefault(); navigate('/app'); };
  return (
    <div className="min-h-screen bg-cream grid md:grid-cols-2">
      <div className="flex flex-col justify-center px-8 md:px-16 py-10">
        <Logo />
        <div className="mt-14 max-w-md">
          <h1 className="font-serif-display text-[40px] font-semibold text-neutral-900">Welcome back</h1>
          <p className="text-neutral-600 mt-2 text-[15px]">Log in to your family jar.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
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
                <input type={show ? 'text' : 'password'} required className="w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-10 py-3 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" placeholder="Enter your password" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-2 text-neutral-600"><input type="checkbox" className="accent-[#3D5A3A]" /> Remember me</label>
              <a href="#" className="text-cumin-green font-medium hover:underline">Forgot password?</a>
            </div>

            <button type="submit" className="w-full bg-cumin-green text-white py-3.5 rounded-lg font-medium hover:bg-[#324A2F] transition-colors">Log in</button>

            <p className="text-center text-[13.5px] text-neutral-600">
              New to CuminJar? <Link to="/get-started" className="text-cumin-green font-semibold hover:underline">Create an account</Link>
            </p>
          </form>
        </div>
      </div>
      <div className="hidden md:block relative">
        <img src={heroImages.grandmaKitchen} alt="grandma" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#3D5A3A]/60 via-transparent to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="font-serif-display text-[26px] font-semibold leading-tight">“The smell of Amma’s kitchen lives in her voice — CuminJar keeps it forever.”</p>
          <p className="mt-2 text-[13px] opacity-80">– A CuminJar family</p>
        </div>
      </div>
    </div>
  );
}
