import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ to = '/', size = 'md' }) {
  const dims = size === 'lg' ? 44 : size === 'sm' ? 28 : 36;
  return (
    <Link to={to} className="flex items-center gap-2 group" aria-label="CuminJar home">
      <svg
        width={dims}
        height={dims + 4}
        viewBox="0 0 44 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 group-hover:-rotate-3"
      >
        {/* Jar body */}
        <rect x="7" y="12" width="30" height="32" rx="6" stroke="#C46B4A" strokeWidth="2.4" fill="none"/>
        {/* Jar lid */}
        <rect x="10" y="4" width="24" height="8" rx="2" stroke="#C46B4A" strokeWidth="2.4" fill="none"/>
        {/* Label */}
        <rect x="13" y="22" width="18" height="10" rx="1.5" fill="#C46B4A" opacity="0.15"/>
        <text x="22" y="29.5" textAnchor="middle" fontSize="6" fontWeight="700" fill="#C46B4A" fontFamily="Inter, sans-serif">CJ</text>
      </svg>
      <span className="font-serif-display text-[26px] font-semibold leading-none">
        <span className="text-terracotta">Cumin</span>
        <span className="text-cumin-green">Jar</span>
      </span>
    </Link>
  );
}
