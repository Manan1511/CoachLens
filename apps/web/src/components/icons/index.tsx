import type { SVGProps } from 'react';

/* Every icon inherits colour via currentColor and sizes from the parent
   unless overridden. Stroke widths match the original inline SVGs. */

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  'aria-hidden': true,
};

export function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PulseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function BarsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20V10M18 20V4M6 20v-4" />
    </svg>
  );
}

export function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export function UserPlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

export function BookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function WaveformIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12h6l3-9 3 18 3-9h5" />
    </svg>
  );
}

export function CrosshairIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2v20M2 12h20" />
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

export function TripodIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2v20M5 22l7-9 7 9" />
    </svg>
  );
}

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

export function BrowserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="4" width="20" height="15" rx="2" />
      <line x1="2" y1="9" x2="22" y2="9" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function PersonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

/** A raised hand, used with a left/right label to indicate bowling arm. */
export function HandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M8 12V5a1.5 1.5 0 0 1 3 0v5" />
      <path d="M11 10V4a1.5 1.5 0 0 1 3 0v6" />
      <path d="M14 10V5a1.5 1.5 0 0 1 3 0v6" />
      <path d="M17 11.5V9a1.5 1.5 0 0 1 3 0v6c0 3.9-3.1 7-7 7h-1c-3 0-4.2-1-6-3l-2.6-3.4a1.4 1.4 0 0 1 2-2L8 16" />
    </svg>
  );
}

/** The wordmark used everywhere outside the intro itself: "Coach" regular,
 *  the L drawn as the same acute angle as the intro animation (fully drawn,
 *  no stroke-in — that draw-on effect is a one-time intro moment, owned by
 *  IntroOverlay/useIntro), "ens" bold. Sizes in em via the shared
 *  `.intro-angle` rule, so it tracks whatever font-size/color the caller's
 *  wrapping element sets. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`whitespace-nowrap ${className}`}>
      <span className="font-normal">Coach</span>
      <span className="intro-angle" aria-hidden>
        <svg viewBox="0 0 34 64" fill="none" stroke="currentColor" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 59 L27 6" />
          <path d="M7 59 L31 59" />
        </svg>
      </span>
      <span className="font-bold">ens</span>
      <span className="visually-hidden">CoachLens</span>
    </span>
  );
}

/** The mark: a C closing around a measured angle. */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M18.2 5.6 A9 9 0 1 0 18.2 18.4" />
      <path d="M9.4 8.7 L13.4 12 L9.4 15.3" />
    </svg>
  );
}
