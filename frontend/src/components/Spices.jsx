import React from 'react';

// Star anise - brown 8-pointed rounded star with center
export function StarAnise({ size = 60, className = '', style = {} }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="anise-g" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#8B5A2B" />
          <stop offset="70%" stopColor="#6E4321" />
          <stop offset="100%" stopColor="#4A2C15" />
        </radialGradient>
        <radialGradient id="anise-seed" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#E9C58C" />
          <stop offset="100%" stopColor="#B48454" />
        </radialGradient>
      </defs>
      <g transform="translate(50 50)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <g key={i} transform={`rotate(${deg})`}>
            <ellipse cx="0" cy="-26" rx="10" ry="18" fill="url(#anise-g)" />
            <ellipse cx="0" cy="-24" rx="4.5" ry="8" fill="url(#anise-seed)" />
          </g>
        ))}
        <circle r="10" fill="#6E4321" />
        <circle r="4" fill="#3E2612" />
      </g>
    </svg>
  );
}

// Cardamom pod - small green oval with ridge
export function Cardamom({ size = 24, className = '', style = {}, rotate = 0 }) {
  return (
    <svg viewBox="0 0 40 60" width={size} height={size * 1.5} className={className} style={{ transform: `rotate(${rotate}deg)`, ...style }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`card-${rotate}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#C7D6A3" />
          <stop offset="60%" stopColor="#96AE6B" />
          <stop offset="100%" stopColor="#6E834B" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="30" rx="12" ry="26" fill={`url(#card-${rotate})`} />
      <path d="M20 5 Q22 15 20 30 Q18 45 20 55" stroke="#5C6E3E" strokeWidth="1.2" fill="none" opacity="0.6" />
      <path d="M20 4 L20 -2 Q22 -4 20 -6" stroke="#7A5836" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// Cinnamon stick - rolled brown curl
export function CinnamonStick({ size = 50, className = '', style = {}, rotate = 0 }) {
  return (
    <svg viewBox="0 0 100 30" width={size * 2} height={size * 0.6} className={className} style={{ transform: `rotate(${rotate}deg)`, ...style }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`cin-${rotate}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#B57A47" />
          <stop offset="50%" stopColor="#8C5A31" />
          <stop offset="100%" stopColor="#5F3B1D" />
        </linearGradient>
      </defs>
      <rect x="5" y="8" width="90" height="14" rx="6" fill={`url(#cin-${rotate})`} />
      <line x1="20" y1="10" x2="20" y2="20" stroke="#5F3B1D" strokeWidth="0.8" opacity="0.5" />
      <line x1="40" y1="10" x2="40" y2="20" stroke="#5F3B1D" strokeWidth="0.8" opacity="0.5" />
      <line x1="60" y1="10" x2="60" y2="20" stroke="#5F3B1D" strokeWidth="0.8" opacity="0.5" />
      <line x1="80" y1="10" x2="80" y2="20" stroke="#5F3B1D" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

// Small leaf sprig (curry leaf style)
export function LeafSprig({ size = 40, className = '', style = {}, rotate = 0 }) {
  return (
    <svg viewBox="0 0 60 40" width={size * 1.5} height={size} className={className} style={{ transform: `rotate(${rotate}deg)`, ...style }} xmlns="http://www.w3.org/2000/svg">
      <path d="M2 20 Q30 5 58 20" stroke="#5D7A4E" strokeWidth="1.5" fill="none" />
      {[8, 16, 24, 32, 40, 48].map((x, i) => (
        <ellipse key={i} cx={x} cy={20 - Math.sin(i) * 2} rx="4" ry="7" fill="#7A9862" transform={`rotate(${i * 15 - 30} ${x} 20)`} opacity="0.85" />
      ))}
    </svg>
  );
}
