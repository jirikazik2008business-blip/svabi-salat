import React from 'react';

const lineProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true'
};

export function TomatoIcon({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="30" r="13" fill="currentColor" />
      <path d="M24 20c0-3 1-5 3-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M15 25c2-2 4-3 6-3M24 17c2 0 4 1 6 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function PepperIcon({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M34 7c-1 5-4 8-9 10-5 3-9 8-10 14-1 8 5 14 13 13 8 0 13-7 11-15-1-5-4-9-9-11 2-3 3-6 2-10-1 0-2 0-2 0"
        fill="currentColor"
      />
      <path d="M31 11c1 2 1 3 1 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function CauliflowerIcon({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="17" cy="21" r="7" fill="currentColor" />
      <circle cx="31" cy="21" r="7" fill="currentColor" />
      <circle cx="24" cy="15" r="8" fill="currentColor" />
      <path d="M16 31h16l2 6c-4 3-16 3-20 0z" fill="currentColor" />
    </svg>
  );
}

export function SaladIcon({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M11 38C13 17 27 9 42 5c-3 20-14 31-33 33z"
        fill="currentColor"
      />
      <path
        d="M17 25c7 2 12 6 14 10"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}

export function CockroachIcon({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <ellipse cx="24" cy="26" rx="12" ry="8" fill="currentColor" />
      <path d="M24 18c-1-4-2-7-5-9M24 18c1-4 2-7 5-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M12 26c-4-1-6 1-7 4M36 26c4-1 6 1 7 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M14 33c-3 1-4 4-4 6M34 33c3 1 4 4 4 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M20 29l-3 8M28 29l3 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function CopyIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...lineProps}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function CrownIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...lineProps}>
      <path d="M3 18h18" />
      <path d="M4 15l-1.5-8L8 11l4-6 4 6 5.5-4L20 15H4z" />
    </svg>
  );
}

export function CheckIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...lineProps}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function LeaveIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...lineProps}>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
    </svg>
  );
}

export function UsersIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...lineProps}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function PlayIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...lineProps}>
      <path d="M6 4l14 8-14 8z" />
    </svg>
  );
}

export function RefreshIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...lineProps}>
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  );
}

export function TrophyIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...lineProps}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4a3 3 0 0 0 3 6M17 6h3a3 3 0 0 1-3 6" />
    </svg>
  );
}

export function WarningIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...lineProps}>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v4" />
      <path d="M12 18h.01" />
    </svg>
  );
}

export function CardIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...lineProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 15h4" />
    </svg>
  );
}