import React, { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it Works' },
  { id: 'legacy-book', label: 'Legacy Book' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'pricing-cta', label: 'Get Started' },
];

export default function LandingSectionNav() {
  const [active, setActive] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      // Trigger when the top of the section enters the middle of the viewport
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const jump = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    // Account for the marketing header (~64px) + this sub-nav (~48px) so the
    // target section header isn't hidden underneath.
    const y = el.getBoundingClientRect().top + window.scrollY - 112;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setActive(id);
  };

  return (
    <nav
      className="sticky top-[64px] z-30 bg-cream/85 backdrop-blur border-y border-neutral-200/70"
      data-testid="landing-section-nav"
      aria-label="Section navigation"
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-10 overflow-x-auto">
        <ul className="flex items-center gap-1 sm:gap-2 py-2 text-[13px]">
          {SECTIONS.map((s) => (
            <li key={s.id} className="flex-shrink-0">
              <a
                href={`#${s.id}`}
                onClick={(e) => jump(e, s.id)}
                data-testid={`nav-link-${s.id}`}
                className={`inline-block px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                  active === s.id
                    ? 'bg-cumin-green text-white'
                    : 'text-neutral-700 hover:text-cumin-green hover:bg-white/70'
                }`}
                aria-current={active === s.id ? 'true' : undefined}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
