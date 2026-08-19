type IconProps = { className?: string };

export function SearchIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

export function BagIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M5.5 8.5h13l-1 11h-11l-1-11Z" strokeLinejoin="round" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 10H4m0 0 4.5-4.5M4 10l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon({ className = "size-4" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 4v12M4 10h12" strokeLinecap="round" /></svg>;
}

export function MinusIcon({ className = "size-4" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 10h12" strokeLinecap="round" /></svg>;
}

export function TrashIcon({ className = "size-4" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4.5 6h11M8 3.5h4M6 6l.7 10h6.6L14 6M8.3 8.5v5M11.7 8.5v5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function CheckIcon({ className = "size-4" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m4 10 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function XIcon({ className = "size-4" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" /></svg>;
}

export function EyeIcon({ className = "size-5" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/></svg>;
}

export function ZoomInIcon({ className = "size-5" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6" strokeLinecap="round"/></svg>;
}

export function ZoomOutIcon({ className = "size-5" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M7.5 10.5h6" strokeLinecap="round"/></svg>;
}

export function FilterIcon({ className = "size-5" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round"/></svg>;
}

export function UserIcon({ className = "size-5" }: IconProps) {
  return <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6" strokeLinecap="round" /></svg>;
}

export function MailIcon({ className = "size-6" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function PhoneIcon({ className = "size-6" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8.2 3.8 10 8.2 7.7 10a15.2 15.2 0 0 0 6.3 6.3l1.8-2.3 4.4 1.8-.8 4a2 2 0 0 1-2 1.6A14.8 14.8 0 0 1 2.6 6.6a2 2 0 0 1 1.6-2l4-.8Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function MessageIcon({ className = "size-6" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 18.5 3.5 21l4.4-1.2c1.2.5 2.6.7 4.1.7 5.2 0 9.5-3.8 9.5-8.5S17.2 3.5 12 3.5 2.5 7.3 2.5 12c0 2.5.9 4.7 2.5 6.5Z" strokeLinecap="round" strokeLinejoin="round" /><path d="M7.5 12h9" strokeLinecap="round" /></svg>;
}

export function ClockIcon({ className = "size-6" }: IconProps) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function HeartIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeartFilledIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export function TruckIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MapPinIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7-6.5-7-11.5a7 7 0 1114 0c0 5-7 11.5-7 11.5z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function EditIcon({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CopyIcon({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="9" width="13" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogOutIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DashboardIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function PackageIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16.5 9.4L7.55 4.24M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalLinkIcon({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TableIcon({ seats = 4, className = "size-16" }: IconProps & { seats?: number }) {
  const markers = seats === 4
    ? [[12, 3], [12, 45], [3, 24], [45, 24]]
    : seats === 6
      ? [[12, 3], [36, 3], [12, 45], [36, 45], [3, 24], [45, 24]]
      : [[10, 3], [24, 3], [38, 3], [10, 45], [24, 45], [38, 45], [3, 24], [45, 24]];

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 48 48" fill="none">
      <rect x="9" y="10" width="30" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" />
      {markers.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="2.4" fill="currentColor" />)}
    </svg>
  );
}

export function StitchIcon({ className = "size-7" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 4l-8.5 8.5" />
      <path d="M20.5 2.5l-2 2" />
      <path d="M10.5 12.5l-2 5 5-2" />
      <path d="M3 21h3" strokeDasharray="1.5 1.5" />
      <path d="M8 21h3" strokeDasharray="1.5 1.5" />
      <path d="M13 21h3" strokeDasharray="1.5 1.5" />
      <path d="M18 21h3" strokeDasharray="1.5 1.5" />
      <path d="M19 4c1.5-1.5 2.5.5 1 2s-4 3-4 6" />
    </svg>
  );
}

export function FabricIcon({ className = "size-7" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="13" height="13" rx="2.5" />
      <path d="M8 17v1.5a2.5 2.5 0 0 0 2.5 2.5h8a2.5 2.5 0 0 0 2.5-2.5v-8a2.5 2.5 0 0 0-2.5-2.5H16" />
      <path d="M3 10.5c3-1.5 6 1.5 9 0" />
      <path d="M3 7.5c3-1.5 6 1.5 9 0" />
    </svg>
  );
}

export function PaisleyIcon({ className = "size-7" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c1.5 3 6.5 4.5 6.5 10.5a6.5 6.5 0 0 1-13 0c0-3.5 2-6.5 4.5-8 0 3.5 1.5 5.5 3.5 5.5 1.5 0 2.5-1 2.5-2.5 0-2-2-3.5-4-5.5Z" />
      <circle cx="12" cy="14.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LockIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RefreshCwIcon({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KeyIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 2l-2 2m-1.5 1.5L14 9M3 21l7-7m0 0a5 5 0 1 0-7-7 5 5 0 0 0 7 7zm6-4l2 2m-2-2l2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DocumentTextIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShoppingCartIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LightbulbIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 5.5v1.5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V14.5c1.5-1 3-3 3-5.5a7 7 0 0 0-7-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SparklesIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM19 16l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3zM5 16l.5 1.5L7 18l-1.5.5L5 20l-.5-1.5L3 18l1.5-.5L5 16z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BanknotesIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="6" width="20" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" strokeLinecap="round" />
    </svg>
  );
}

export function TrendingUpIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 6 23 6 23 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BarChartIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShoppingBagIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 10a4 4 0 0 1-8 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UsersIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TagIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertTriangleIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FlameIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DiamondIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h12l4 6-10 12L2 9z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 3L8 9l4 12 4-12-3-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 9h20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MedalIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="14" r="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8V2M8.2 4.2L6 2M15.8 4.2L18 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 14l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrophyIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 22h16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 4h12a2 2 0 0 1 2 2v3a8 8 0 0 1-16 0V6a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ReceiptIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7h8M8 11h8M8 15h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarFilledIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarHalfIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <defs>
        <linearGradient id="half-star-gradient">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" stopOpacity="1" />
        </linearGradient>
      </defs>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#half-star-gradient)" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChatBubbleIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}



