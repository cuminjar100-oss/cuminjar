import React, { useState } from 'react';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { Mail, MapPin, MessageCircle, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/use-toast';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'General enquiry', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitContact(form);
      setSent(true);
      toast({ title: 'Message sent', description: 'We\u2019ll get back to you within 24 hours.' });
    } catch (err) {
      toast({ title: 'Could not send', description: err?.response?.data?.detail || err?.message || 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <MarketingHeader />
      <section className="max-w-6xl mx-auto px-6 lg:px-10 pt-14 pb-4 text-center">
        <span className="inline-block bg-[#F7DFCE] text-terracotta text-[11px] font-semibold tracking-[0.18em] px-4 py-2 rounded-full">WE’D LOVE TO HEAR</span>
        <h1 className="font-serif-display text-[46px] md:text-[54px] font-semibold mt-6 leading-[1.05]">Say <span className="text-terracotta italic">hello</span>.</h1>
        <p className="mt-4 text-neutral-600 text-[16px] max-w-xl mx-auto">Have a question, feedback, or just want to share a memory? We read every message.</p>
      </section>

      <section className="max-w-5xl mx-auto px-6 lg:px-10 py-10 grid md:grid-cols-3 gap-6">
        <ContactCard icon={Mail} title="Email" desc="hello@cuminjar.com" sub="We reply within 24 hours." />
        <ContactCard icon={MessageCircle} title="Support" desc="support@cuminjar.com" sub="For account &amp; billing help." />
        <ContactCard icon={MapPin} title="Address" desc="Bengaluru, India" sub="Also San Jose &amp; Toronto." />
      </section>

      <section className="max-w-3xl mx-auto px-6 lg:px-10 pb-16">
        <div className="bg-white rounded-3xl border border-neutral-200/70 p-8 md:p-10">
          {sent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#DFEAD8] flex items-center justify-center"><CheckCircle2 size={28} className="text-cumin-green" /></div>
              <h3 className="font-serif-display text-[26px] font-semibold mt-4">Thank you!</h3>
              <p className="text-neutral-600 mt-2 text-[15px]">Your message has landed in our jar. We’ll be in touch soon.</p>
              <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: 'General enquiry', message: '' }); }} className="mt-6 text-cumin-green font-medium hover:underline">Send another message</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h2 className="font-serif-display text-[26px] font-semibold text-neutral-900">Send us a message</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[13px] font-semibold text-neutral-800">Your name</span>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Meera Rao" className="mt-1.5 w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" />
                </label>
                <label className="block">
                  <span className="text-[13px] font-semibold text-neutral-800">Email</span>
                  <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@family.com" className="mt-1.5 w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10" />
                </label>
              </div>
              <label className="block">
                <span className="text-[13px] font-semibold text-neutral-800">Subject</span>
                <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="mt-1.5 w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10">
                  <option>General enquiry</option>
                  <option>Account &amp; billing</option>
                  <option>Feedback / suggestion</option>
                  <option>Press / partnerships</option>
                  <option>Privacy request</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold text-neutral-800">Message</span>
                <textarea required rows={6} value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Tell us what’s on your mind…" className="mt-1.5 w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green focus:ring-2 focus:ring-cumin-green/10 resize-none" />
              </label>
              <button disabled={submitting} type="submit" className="w-full bg-cumin-green text-white py-3.5 rounded-lg font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                {submitting && <Loader2 size={15} className="animate-spin" />} Send message
              </button>
              <p className="text-[12px] text-neutral-500 text-center">By submitting, you agree to our <a href="/terms" className="underline">Terms &amp; Privacy</a>.</p>
            </form>
          )}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function ContactCard({ icon: Icon, title, desc, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/70 p-6 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-[#F5EDDD] flex items-center justify-center">
        <Icon size={20} className="text-terracotta" />
      </div>
      <p className="font-semibold text-neutral-900 mt-3">{title}</p>
      <p className="text-neutral-800 text-[14.5px] mt-1" dangerouslySetInnerHTML={{ __html: desc }} />
      <p className="text-[12.5px] text-neutral-500 mt-1" dangerouslySetInnerHTML={{ __html: sub }} />
    </div>
  );
}
