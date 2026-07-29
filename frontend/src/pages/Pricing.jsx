import React, { useEffect, useState } from 'react';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import api from '../api';
import { getCachedAuthUser } from '../utils/authCache';
import { useToast } from '../hooks/use-toast';

const plans = [
  {
    key: 'free',
    name: 'Family Free',
    price: '₹0',
    cadence: '/ forever',
    desc: 'Start preserving. Try CuminJar with your family.',
    features: ['1 family group', '1 family member', 'Up to 3 recipes', '2 GB storage', 'Basic AI transcription', 'Community support'],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    key: 'legacy',
    name: 'Family Legacy',
    price: '₹2,999',
    cadence: '/ year',
    desc: 'Unlimited recipes, stories & traditions — plus a printed heirloom family book to preserve them forever.',
    features: [
      'Unlimited voice recipes, stories & festivals',
      'Unlimited family members',
      'Printed heirloom family book (hardbound, delivered)',
      'QR code on every page — hear Paati\u2019s voice',
      '200 GB voice & photo storage',
      'Advanced AI + translation in every Indian language',
      'Priority support',
      'Yearly heritage backup — safe for generations',
    ],
    cta: 'Preserve Forever',
    highlighted: true,
  },
];

// Razorpay checkout.js CDN — loaded lazily on first checkout attempt so the
// marketing page stays fast for visitors who never intend to upgrade.
const RAZORPAY_SDK = 'https://checkout.razorpay.com/v1/checkout.js';
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = RAZORPAY_SDK;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Pricing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const authUser = getCachedAuthUser();

  // Warm the SDK once the marketing page mounts (non-blocking).
  useEffect(() => { loadRazorpay(); }, []);

  const handlePreserveForever = async () => {
    // Guests must sign up first — we can't attach the plan to nobody.
    if (!authUser) {
      try { window.sessionStorage.setItem('pending_upgrade', 'legacy'); } catch { /* ignore */ }
      navigate('/get-started');
      return;
    }
    setCheckoutBusy(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) {
        toast({ title: 'Could not load payments', description: 'Please check your internet and try again.' });
        setCheckoutBusy(false);
        return;
      }
      const order = await api.createRazorpayOrder();
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'CuminJar — Family Legacy',
        description: 'Unlimited recipes, stories & heirloom book · ₹2,999 / year',
        image: `${window.location.origin}/cuminjar-share.png`,
        prefill: {
          name: authUser.name || '',
          email: authUser.email || '',
        },
        notes: { plan: 'legacy' },
        theme: { color: '#3D5637' },
        handler: async (resp) => {
          try {
            await api.verifyRazorpayPayment({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            toast({ title: 'Welcome to Family Legacy 🫙', description: 'Your jar is now unlimited. A confirmation is on its way.' });
            setTimeout(() => navigate('/app?upgraded=1'), 1200);
          } catch (err) {
            toast({ title: 'Payment could not be verified', description: err?.response?.data?.detail || 'Please contact support.' });
          } finally {
            setCheckoutBusy(false);
          }
        },
        modal: {
          ondismiss: () => setCheckoutBusy(false),
        },
      });
      rzp.on('payment.failed', (r) => {
        toast({ title: 'Payment failed', description: r?.error?.description || 'Please try a different card.' });
        setCheckoutBusy(false);
      });
      rzp.open();
    } catch (err) {
      toast({ title: 'Could not start checkout', description: err?.response?.data?.detail || err?.message });
      setCheckoutBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <MarketingHeader />
      <section className="max-w-6xl mx-auto px-6 lg:px-10 pt-14 pb-8 text-center">
        <span className="inline-block bg-[#F7DFCE] text-terracotta text-[11px] font-semibold tracking-[0.18em] px-4 py-2 rounded-full">SIMPLE PRICING</span>
        <h1 className="font-serif-display text-[46px] md:text-[56px] font-semibold mt-6 leading-[1.05]">A plan for every <span className="text-terracotta italic">family</span>.</h1>
        <p className="mt-6 text-[17px] text-neutral-600 max-w-2xl mx-auto leading-relaxed">Start free. Upgrade when you want more space for your memories.</p>
      </section>

      <section className="max-w-4xl mx-auto px-6 lg:px-10 py-10 grid md:grid-cols-2 gap-6">
        {plans.map(p => (
          <div
            key={p.name}
            className={`rounded-3xl p-8 border transition-all ${p.highlighted
              ? 'bg-white border-cumin-green shadow-xl -translate-y-2'
              : 'bg-white border-neutral-200/70 hover:shadow-md'}`}
          >
            {p.highlighted && (
              <span className="inline-block bg-cumin-green text-white text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full mb-3">MOST LOVED</span>
            )}
            <h3 className="font-serif-display text-[26px] font-semibold text-neutral-900">{p.name}</h3>
            <p className="text-[13.5px] text-neutral-500 mt-1">{p.desc}</p>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-serif-display text-[44px] font-semibold text-neutral-900">{p.price}</span>
              <span className="text-neutral-500 text-[14px]">{p.cadence}</span>
            </div>
            {p.key === 'legacy' ? (
              <button
                type="button"
                onClick={handlePreserveForever}
                disabled={checkoutBusy}
                data-testid="preserve-forever-cta"
                className="mt-6 w-full text-center font-medium py-3 rounded-lg transition-all bg-cumin-green text-white hover:bg-[#324A2F] disabled:opacity-70 inline-flex items-center justify-center gap-2"
              >
                {checkoutBusy && <Loader2 size={15} className="animate-spin" />}
                {checkoutBusy ? 'Opening secure checkout…' : p.cta}
              </button>
            ) : (
              <Link
                to="/get-started"
                data-testid="start-free-cta"
                className="mt-6 block text-center font-medium py-3 rounded-lg transition-all bg-[#F5EDDD] text-neutral-900 hover:bg-[#EFE3CB]"
              >
                {p.cta}
              </Link>
            )}
            <ul className="mt-6 space-y-3">
              {p.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-[14px] text-neutral-700">
                  <Check size={16} className="text-cumin-green mt-0.5" /> {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="max-w-3xl mx-auto px-6 lg:px-10 py-14 text-center">
        <p className="text-neutral-600 text-[15px]">All plans include end-to-end encryption, cloud backup and native mobile apps. Cancel anytime.</p>
        <p className="mt-3 text-neutral-500 text-[12.5px]">Secure payments powered by Razorpay · Test card <code className="bg-neutral-100 px-1.5 py-0.5 rounded">4111 1111 1111 1111</code></p>
      </section>
      <MarketingFooter />
    </div>
  );
}
