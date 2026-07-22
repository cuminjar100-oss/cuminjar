import React, { useState } from 'react';
import AppShell from '../components/AppShell';
import { Users, Mic, Sparkles, Globe, Image as ImageIcon, Lightbulb, Lock, Plus } from 'lucide-react';
import { heroImages, familyAvatars } from '../mock';
import { useToast } from '../hooks/use-toast';

export default function Dashboard() {
  const [step] = useState(1);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [lang, setLang] = useState('English');
  const { toast } = useToast();

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Family Group Name required', description: 'Please add a name for your family space.' });
      return;
    }
    // save to localStorage as mock
    const family = { name, desc, lang, createdAt: new Date().toISOString() };
    localStorage.setItem('cuminjar_family', JSON.stringify(family));
    toast({ title: 'Family Group Created!', description: `${name} is ready. Next: invite family.` });
  };

  return (
    <AppShell active="home">
      <div className="px-8 py-6">
        {/* Welcome Banner */}
        <div className="bg-[#F7DFCE]/60 rounded-2xl px-8 py-6 flex items-center justify-between gap-8 overflow-hidden relative">
          <div className="max-w-lg z-10">
            <h1 className="font-serif-display text-[32px] md:text-[36px] font-semibold text-neutral-900 leading-tight">
              Welcome to CuminJar, Meera! <span className="inline-block">👋</span>
            </h1>
            <p className="mt-2 text-[15px] text-neutral-700">Create your family space to preserve recipes, traditions, and stories together.</p>
          </div>
          <div className="hidden md:flex items-center gap-4 relative">
            <img src={heroImages.claypotFrame} alt="family jar" className="h-32 w-40 object-cover rounded-xl shadow-md" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          {/* Form Card */}
          <form onSubmit={handleCreate} className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200/70 p-8">
            <h2 className="font-serif-display text-[28px] font-semibold text-neutral-900">Create your family group</h2>
            <p className="text-[14px] text-neutral-500 mt-2">Step {step} of 3</p>
            <p className="text-[14px] text-neutral-700 mt-0.5">Tell us about your family</p>

            {/* Stepper */}
            <div className="flex items-center gap-2 mt-6 max-w-md">
              {[1,2,3].map((n, idx) => (
                <React.Fragment key={n}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold border ${
                    n === step ? 'bg-cumin-green text-white border-cumin-green' : 'bg-white text-neutral-400 border-neutral-300'
                  }`}>{n}</div>
                  {idx < 2 && <div className="flex-1 h-[2px] bg-neutral-200 rounded" />}
                </React.Fragment>
              ))}
            </div>

            {/* Group Name */}
            <div className="mt-8">
              <label className="text-[14px] font-semibold text-neutral-900">
                Family Group Name <span className="text-terracotta">*</span>
              </label>
              <p className="text-[13px] text-neutral-500 mt-0.5">What would you like to call your family group?</p>
              <div className="relative mt-2">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value.slice(0, 50))}
                  placeholder="e.g., Rao Family"
                  className="w-full bg-white border border-neutral-200 rounded-lg px-4 py-3 text-[14px] placeholder:text-neutral-400 focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10 transition-all"
                />
                <span className="absolute right-3 -bottom-5 text-[11px] text-neutral-400">{name.length}/50</span>
              </div>
            </div>

            {/* Description */}
            <div className="mt-8">
              <label className="text-[14px] font-semibold text-neutral-900">
                Family Description / Family Story <span className="text-terracotta">*</span>
              </label>
              <p className="text-[13px] text-neutral-500 mt-0.5">Share a little about your family—your roots, values, traditions, or what makes your family special.</p>
              <div className="relative mt-2">
                <textarea
                  rows={5}
                  value={desc}
                  onChange={e => setDesc(e.target.value.slice(0, 300))}
                  placeholder="e.g., We are a close-knit family that cherishes home-cooked meals, celebrates festivals together, and believes in staying connected through stories and traditions."
                  className="w-full bg-white border border-neutral-200 rounded-lg px-4 py-3 text-[14px] placeholder:text-neutral-400 focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10 transition-all resize-none"
                />
                <span className="absolute right-3 bottom-3 text-[11px] text-neutral-400">{desc.length}/300</span>
              </div>
            </div>

            {/* Language */}
            <div className="mt-6">
              <label className="text-[14px] font-semibold text-neutral-900">Primary Family Language <span className="text-terracotta">*</span></label>
              <p className="text-[13px] text-neutral-500 mt-0.5">This helps us provide the best voice and transcription experience.</p>
              <div className="relative mt-2">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={17} />
                <select
                  value={lang}
                  onChange={e => setLang(e.target.value)}
                  className="w-full appearance-none bg-white border border-neutral-200 rounded-lg pl-10 pr-10 py-3 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10"
                >
                  {['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cover photo */}
            <div className="mt-6">
              <label className="text-[14px] font-semibold text-neutral-900">Family Cover Photo</label>
              <p className="text-[13px] text-neutral-500 mt-0.5">Add a photo that represents your family. You can change it later.</p>
              <div className="mt-3 border border-dashed border-neutral-300 rounded-xl bg-[#FBF6EE] p-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-white flex items-center justify-center border border-neutral-200 mb-3">
                  <ImageIcon size={20} className="text-terracotta" />
                </div>
                <p className="font-semibold text-neutral-900 text-[14px]">Upload a photo</p>
                <p className="text-[12px] text-neutral-500 mt-1">JPG, PNG up to 5MB</p>
                <button type="button" className="mt-3 bg-white border border-neutral-200 text-neutral-800 text-[13px] font-medium px-4 py-2 rounded-md hover:border-cumin-green transition-colors">Choose File</button>
              </div>
            </div>

            {/* Tip */}
            <div className="mt-6 bg-[#FCF3D9] border border-[#F4E4B0] rounded-lg px-4 py-3 flex items-start gap-2">
              <Lightbulb size={17} className="text-[#B08238] mt-0.5" />
              <p className="text-[13px] text-neutral-700"><span className="font-semibold">Tip:</span> You can always update these details later in Settings.</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full mt-6 bg-cumin-green text-white text-[15px] font-medium py-3.5 rounded-lg hover:bg-[#324A2F] transition-all shadow-sm hover:shadow-md"
            >
              Create Family Group
            </button>
            <p className="mt-3 text-[12px] text-neutral-500 flex items-center justify-center gap-1.5">
              <Lock size={12} /> Your family space is private and secure.
            </p>
          </form>

          {/* Side card */}
          <aside className="bg-white rounded-2xl border border-neutral-200/70 p-6 h-fit">
            <h3 className="font-serif-display text-[22px] font-semibold text-neutral-900">What happens next?</h3>
            <p className="text-[13.5px] text-neutral-600 mt-2">In the next few steps, you’ll set up your family space and invite others.</p>

            <div className="mt-6 space-y-6">
              {[
                { n: 1, icon: Users, title: 'Invite Your Family', desc: 'Invite family members to join your private space.', tint: 'bg-[#F7DFCE]', iconClass: 'text-terracotta' },
                { n: 2, icon: Mic, title: 'Collect Voice Recipes', desc: 'Record recipes and stories in your family’s voice.', tint: 'bg-[#DFEAD8]', iconClass: 'text-[#5D7A4E]' },
                { n: 3, icon: Sparkles, title: 'Save & Cherish Memories', desc: 'Organize, relive, and pass down your legacy.', tint: 'bg-[#E4DEF4]', iconClass: 'text-[#7A6FB0]' }
              ].map((s, i) => (
                <div key={s.n} className="text-center">
                  <div className={`w-14 h-14 mx-auto rounded-full ${s.tint} flex items-center justify-center`}>
                    <s.icon size={22} className={s.iconClass} />
                  </div>
                  <p className="font-semibold text-neutral-900 text-[14.5px] mt-3">{s.n}. {s.title}</p>
                  <p className="text-[13px] text-neutral-600 mt-1">{s.desc}</p>
                  {i < 2 && <div className="w-px h-6 mx-auto mt-3 border-l border-dashed border-neutral-300" />}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl overflow-hidden">
              <img src={heroImages.recipeJournal} alt="recipe journal" className="w-full h-40 object-cover" />
            </div>
          </aside>
        </div>

        {/* Bottom testimonial strip */}
        <div className="mt-6 bg-[#F7EFE3] rounded-2xl px-8 py-5 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-start gap-3 max-w-xl">
            <span className="font-serif-display text-[40px] leading-none text-terracotta">“</span>
            <div>
              <p className="text-[14.5px] text-neutral-700 italic">“Recipes are more than ingredients. They’re our history, our love, and our way of staying close.”</p>
              <p className="text-[12px] text-neutral-500 mt-1">– Meera R.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {familyAvatars.map((src, i) => <img key={i} src={src} alt="member" className="w-9 h-9 rounded-full border-2 border-white object-cover" />)}
            </div>
            <button className="w-10 h-10 rounded-full bg-[#F7DFCE] flex items-center justify-center text-terracotta hover:bg-[#F0C9B0] transition-colors">
              <Plus size={16} />
            </button>
            <span className="text-[13px] text-neutral-700 leading-tight">Invite<br />Family</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
