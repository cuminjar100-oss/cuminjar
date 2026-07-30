import React, { useState } from 'react';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { Link } from 'react-router-dom';
import { ChevronDown, MessageCircle, BookHeart } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'What exactly is CuminJar?',
    a: 'CuminJar is a private jar for your family — a place to preserve recipes, stories, festivals and traditions in the voices of the people you love. Grandma talks, we transcribe & translate, and everyone in the family can hold on to it forever.',
  },
  {
    q: 'Do I have to type anything to save a recipe?',
    a: 'No. Just tap Record, hold the mic, and speak — in any Indian language. CuminJar auto-detects the language, transcribes it to English, extracts the ingredients & steps, and even generates a cover image. Zero typing required.',
  },
  {
    q: 'Can I ask my grandmother to record a recipe from her own phone?',
    a: 'Yes — that\u2019s our favourite feature. Tap "Ask family via WhatsApp", type the dish name, and we open WhatsApp with a warm message ready. Pick your grandmother from your WhatsApp contacts, hit Send. She taps the link, holds the mic in her browser, and speaks. The recipe lands in your jar automatically — with her voice, forever.',
  },
  {
    q: 'Does she need to sign up for CuminJar?',
    a: 'No. Whoever you invite via WhatsApp records on a public link — no login, no app to install, nothing to remember. You are the account holder; her voice + recipe simply lives in your family jar.',
  },
  {
    q: 'What languages does CuminJar understand?',
    a: 'English, Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi — plus code-mixed conversations (like Tamil-English "tanglish"). Powered by Sarvam AI\u2019s Indic speech engine.',
  },
  {
    q: 'Who can see my family\u2019s recipes and stories?',
    a: 'Only you and the family members you invite. Every recipe is private by default, scoped to your family jar. You can optionally generate a public shareable cookbook link to send to friends — that\u2019s the only way anything leaves your jar.',
  },
  {
    q: 'What is the "heirloom family book"?',
    a: 'Once your jar holds 30 recipes and stories, you can order a hardbound printed heirloom book. Every page has a QR code — anyone in your family can scan it and hear the original voice recording. It\u2019s included in the Family Legacy plan.',
  },
  {
    q: 'How much does CuminJar cost?',
    a: 'Family Free lets you save up to 3 recipes forever, no card required. Family Legacy is ₹2,999/year for unlimited recipes, stories, unlimited family members and the printed heirloom book. You can cancel anytime.',
  },
  {
    q: 'Can I invite my whole family?',
    a: 'Absolutely. Send email invites or share a QR code that anyone can scan to join instantly. Free plan invites 1 member; Family Legacy allows unlimited.',
  },
  {
    q: 'What happens if I stop paying?',
    a: 'Nothing disappears. Your recipes stay safe forever, viewable, downloadable. You just can\u2019t add new ones beyond the free tier\u2019s 3-recipe limit until you resubscribe. Your family\u2019s memories are never held hostage.',
  },
  {
    q: 'How do I get help or share feedback?',
    a: 'Email admin@cuminjar.com or use the Contact form. We\u2019re a small team — replies usually go out within 24 hours.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <div className="min-h-screen bg-cream">
      <MarketingHeader />

      <section className="max-w-3xl mx-auto px-6 lg:px-10 pt-14 pb-4 text-center">
        <span className="inline-block bg-[#F7DFCE] text-terracotta text-[11px] font-semibold tracking-[0.18em] px-4 py-2 rounded-full">
          HELP CENTRE
        </span>
        <h1 className="font-serif-display text-[42px] md:text-[54px] font-semibold mt-6 leading-[1.05]">
          Everything you might <span className="text-terracotta italic">wonder</span>.
        </h1>
        <p className="mt-5 text-[16px] text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          Answers to the questions families ask us most. Can&rsquo;t find yours?
          <Link to="/contact" className="text-cumin-green underline decoration-cumin-green/40 hover:decoration-cumin-green ml-1">
            Ask us directly &rarr;
          </Link>
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
        <div className="bg-white rounded-2xl border border-neutral-200/70 divide-y divide-neutral-100 overflow-hidden" data-testid="faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? -1 : i)}
                data-testid={`faq-item-${i}`}
                className="w-full flex items-center justify-between gap-4 px-5 py-5 text-left hover:bg-[#FBF6EE] transition-colors"
              >
                <span className="font-medium text-neutral-900 text-[15.5px] leading-snug">{item.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-neutral-500 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180 text-cumin-green' : ''}`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-5 -mt-1 text-[14.5px] text-neutral-700 leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 lg:px-10 pb-16">
        <div className="bg-[#F7EFE1] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-terracotta shrink-0">
            <BookHeart size={26} />
          </div>
          <div className="flex-1">
            <p className="font-serif-display text-[22px] font-semibold text-neutral-900 leading-tight">Still have a question?</p>
            <p className="mt-1 text-[13.5px] text-neutral-600">We reply within a day &mdash; usually much sooner.</p>
          </div>
          <Link
            to="/contact"
            data-testid="faq-contact-cta"
            className="inline-flex items-center gap-2 bg-cumin-green text-white px-5 py-3 rounded-lg font-medium hover:bg-[#324A2F] transition-colors text-[14px]"
          >
            <MessageCircle size={15} /> Talk to us
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
