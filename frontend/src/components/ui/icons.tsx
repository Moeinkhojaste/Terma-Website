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

export function InstagramIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TelegramIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2.5L2 10.5l6.5 2.5 2.5 6.5 3.5-3.5 5 4 2-17.5z" />
      <path d="M8.5 13l9.5-7.5-7.5 9-.5 4-1.5-5.5z" fill="currentColor" />
    </svg>
  );
}

export function WhatsAppIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 14.3c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8.9-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.1.2-.2.2-.4.1-.2 0-.3 0-.4-.1-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2 0 1.2.9 2.3 1 2.5.1.2 1.7 2.6 4.1 3.6.6.3 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1-.1-.2-.2-.3-.5-.4z" />
      <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.4 5L2 22l5.2-1.4c1.4.8 3.1 1.3 4.8 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.2.8.9-3.1-.2-.3c-.9-1.4-1.4-3-1.4-4.7 0-4.5 3.7-8.2 8.2-8.2 4.5 0 8.2 3.7 8.2 8.2 0 4.5-3.7 8.2-8.2 8.2z" />
    </svg>
  );
}

export function CreditCardIcon({ className = "size-5" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" strokeLinecap="round" />
    </svg>
  );
}

export function OnlinePaymentIcon({ className = "h-6 w-auto" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="24" rx="4" fill="#0E4743" />
      <rect y="5" width="36" height="4.5" fill="#145A55" />
      <rect x="4" y="12.5" width="6.5" height="5.5" rx="1.5" fill="#D8AA68" />
      <path d="M4 14.5H10.5M7 12.5V18" stroke="#B58A4A" strokeWidth="0.75" />
      <circle cx="28.5" cy="15.5" r="3.5" fill="#D8AA68" fillOpacity="0.9" />
      <circle cx="24" cy="15.5" r="3.5" fill="#FFFFFF" fillOpacity="0.7" />
    </svg>
  );
}

export function SnappPayLogo({ className = "h-7 w-auto" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 80 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0, -16)">
        <path fillRule="evenodd" clipRule="evenodd" d="M6.0419 50.1517H4.53687V45.9942H6.0419C7.70855 45.9942 8.54152 46.6872 8.54152 48.073C8.54152 49.459 7.70855 50.1517 6.0419 50.1517ZM7.22267 42.5H2.251e-10V59.1745H4.53687V53.6457H7.22267C9.18197 53.6457 10.6835 53.1595 11.7251 52.1862C12.7668 51.2132 13.2878 49.842 13.2878 48.073C13.2878 46.3037 12.7668 44.9327 11.7251 43.9595C10.6835 42.9865 9.18197 42.5 7.22267 42.5Z" fill="#007DFA" />
        <path fillRule="evenodd" clipRule="evenodd" d="M23.6467 54.5057C23.4995 54.8155 23.3067 55.0885 23.0677 55.3242C22.8285 55.5602 22.543 55.7442 22.2112 55.8767C21.8792 56.0097 21.5282 56.076 21.1582 56.076C20.772 56.076 20.4132 56.0097 20.0815 55.8767C19.7495 55.7442 19.4642 55.5602 19.225 55.3242C18.9857 55.0885 18.7967 54.812 18.6577 54.4947C18.519 54.178 18.4495 53.8352 18.4495 53.4665C18.4495 53.1127 18.519 52.7845 18.6577 52.4825C18.7967 52.1805 18.9857 51.9112 19.225 51.6752C19.4642 51.4397 19.7495 51.255 20.0815 51.1222C20.4132 50.9897 20.772 50.9232 21.1582 50.9232C21.5282 50.9232 21.8792 50.9897 22.2112 51.1222C22.543 51.255 22.8285 51.4397 23.0677 51.6752C23.3067 51.9112 23.4995 52.1875 23.6467 52.5045C23.7932 52.8217 23.8662 53.157 23.8662 53.5107C23.8662 53.8645 23.7932 54.1965 23.6467 54.5057ZM23.7275 48.9552C22.755 47.9675 21.5282 47.4735 20.0472 47.4735C19.1675 47.4735 18.3642 47.632 17.6392 47.9487C16.9137 48.2662 16.2887 48.6975 15.7642 49.2427C15.239 49.7882 14.8301 50.4255 14.5371 51.1555C14.2438 51.885 14.0973 52.6555 14.0973 53.4665C14.0973 54.3367 14.248 55.14 14.5484 55.8767C14.8498 56.614 15.2702 57.2557 15.8107 57.801C16.3502 58.3465 16.9832 58.7702 17.7087 59.0725C18.4335 59.3745 19.229 59.5257 20.0932 59.5257C21.621 59.5257 22.8325 58.9877 23.7275 57.9112V59.172H27.9407V47.8272H23.7275V48.9552Z" fill="#007DFA" />
        <path fillRule="evenodd" clipRule="evenodd" d="M37.1538 53.6414L33.9821 47.8249H29.1211L34.8618 57.6219L30.8108 64.8314H35.5103L45.0483 47.8249H40.2328L37.1538 53.6414Z" fill="#007DFA" />
        <path d="M8.59219 24.7934L7.43262 24.4454C6.64498 24.1898 5.41586 23.7948 5.41586 22.7731C5.41586 21.7973 6.52894 21.3095 7.36346 21.3095C7.77534 21.3095 8.18107 21.3731 8.57067 21.4885C9.73216 21.8331 10.9736 21.3061 11.5265 20.227L12.1723 18.9655C12.18 18.9517 12.1742 18.9336 12.1604 18.9263C10.6093 18.0516 8.46655 17.5 6.71413 17.5C3.21353 17.5 0.686539 19.8228 0.686539 23.3768C0.686539 26.7682 2.56459 27.5116 5.41586 28.3242C6.38985 28.603 8.17454 29.0445 8.17454 30.3222C8.17454 31.5529 7.0388 32.0872 5.97221 32.0872C4.41882 32.0872 3.07483 31.2742 1.9387 30.2756L0.0034012 33.9219C-0.0035147 33.9354 0.00032732 33.9519 0.0130065 33.9608C1.79385 35.2057 3.94162 35.9433 6.13473 35.9433C7.89637 35.9433 9.72793 35.4552 11.0961 34.2942C12.487 33.1093 12.9043 31.3204 12.9043 29.5788C12.9043 26.7444 11.0262 25.514 8.59219 24.7934Z" fill="#007DFA" />
        <path d="M20.137 26.5332C22.2241 26.5332 22.0381 28.5304 22.0381 29.6691V35.4457C22.0381 35.4623 22.0516 35.4758 22.0681 35.4758H23.7456C25.133 35.4758 26.2576 34.3494 26.2576 32.9589V28.1127C26.2576 25.1858 24.9824 23.1648 21.7834 23.1648C20.1424 23.1648 18.9621 23.6499 17.99 25.0796C17.9842 25.0877 17.9754 25.0931 17.9654 25.0931C17.9489 25.0931 17.9347 25.0796 17.9347 25.063V23.5898C17.9347 23.5736 17.9212 23.5598 17.9043 23.5598H13.7452C13.7287 23.5598 13.7152 23.5736 13.7152 23.5898V35.4457C13.7152 35.4623 13.7287 35.4758 13.7452 35.4758H15.4227C16.8105 35.4758 17.9347 34.3494 17.9347 32.9589V29.2976C17.9347 27.8105 18.4215 26.5332 20.137 26.5332Z" fill="#007DFA" />
        <path d="M34.1294 32.2022C32.4139 32.2022 31.4168 31.0404 31.4168 29.531C31.4168 28.0678 32.4139 26.8367 34.1294 26.8367C35.8453 26.8367 36.842 28.0678 36.842 29.531C36.842 31.0404 35.8453 32.2022 34.1294 32.2022ZM36.7325 23.5614C36.7163 23.5614 36.7025 23.5749 36.7025 23.5915V24.6416C36.7025 24.6701 36.6683 24.6824 36.6502 24.6617C35.765 23.6577 34.3576 23.1661 33.0167 23.1661C29.4927 23.1661 27.0586 26.0933 27.0586 29.5079C27.0586 32.9225 29.5392 35.872 33.0632 35.872C34.4487 35.872 35.9033 35.3423 36.6479 34.167C36.6529 34.1586 36.6629 34.1532 36.6725 34.1532C36.6894 34.1532 36.7025 34.167 36.7025 34.1832V35.4474C36.7025 35.464 36.7163 35.4774 36.7325 35.4774H38.41C39.7977 35.4774 40.9223 34.3507 40.9223 32.9606V23.5915C40.9223 23.5749 40.9093 23.5614 40.8924 23.5614H36.7325Z" fill="#007DFA" />
        <path d="M49.0064 32.2023C47.2901 32.2023 46.2934 31.0405 46.2934 29.5311C46.2934 28.0678 47.2901 26.8368 49.0064 26.8368C50.7219 26.8368 51.7186 28.0678 51.7186 29.5311C51.7186 31.0405 50.7219 32.2023 49.0064 32.2023ZM50.0726 23.1662C48.6867 23.1662 47.2547 23.7198 46.4878 24.8954C46.4825 24.9035 46.4725 24.9085 46.4632 24.9085C46.4463 24.9085 46.4329 24.8954 46.4329 24.8785V23.5615H42.2134V40.5028H43.9209C45.3083 40.5028 46.4329 39.376 46.4329 37.9859V34.3496L46.4394 34.3473C47.3439 35.3867 48.7543 35.8721 50.1191 35.8721C53.6427 35.8721 56.0771 32.9918 56.0771 29.5542C56.0771 26.1396 53.6197 23.1662 50.0726 23.1662Z" fill="#007DFA" />
        <path d="M63.6576 26.8368C65.3731 26.8368 66.3705 28.0678 66.3705 29.5311C66.3705 31.0409 65.3731 32.2023 63.6576 32.2023C61.9417 32.2023 60.945 31.0409 60.945 29.5311C60.945 28.0678 61.9417 26.8368 63.6576 26.8368ZM58.5725 40.5028C59.9595 40.5028 61.0845 39.376 61.0845 37.9863V34.4185C61.0845 34.3908 61.1183 34.3785 61.1363 34.3992C62.0427 35.4036 63.4286 35.8725 64.7703 35.8725C68.2943 35.8725 70.7283 32.9918 70.7283 29.5546C70.7283 26.1396 68.2713 23.1666 64.7238 23.1666C63.3383 23.1666 61.9063 23.7197 61.1394 24.8954C61.134 24.9039 61.1244 24.9085 61.1144 24.9085C61.0979 24.9085 61.0845 24.8954 61.0845 24.8785V23.5916C61.0845 23.575 61.071 23.5615 61.0545 23.5615H56.8946C56.8781 23.5615 56.8646 23.575 56.8646 23.5916V40.4727C56.8646 40.4897 56.8781 40.5028 56.8946 40.5028H58.5725Z" fill="#007DFA" />
        <path d="M75.1861 28.9655C76.3369 28.9655 77.3412 28.186 77.6286 27.0696L80 17.9634H75.6687L72.809 28.9655H75.1861Z" fill="#007DFA" />
        <path d="M74.2332 35.8707C75.7063 35.8707 76.9023 34.6719 76.9023 33.196C76.9023 31.7201 75.7063 30.5213 74.2332 30.5213C72.7593 30.5213 71.5632 31.7201 71.5632 33.196C71.5632 34.6719 72.7593 35.8707 74.2332 35.8707Z" fill="#007DFA" />
        <path d="M72.9226 18.185H72.9284L73.2592 19.1097H73.4063L73.7379 18.185H73.7437V19.1097H73.9926V17.964H73.5908L73.3329 18.6419L73.0751 17.964H72.6732V19.1097H72.9226V18.185Z" fill="#007DFA" />
        <path d="M71.9117 19.111H72.1864V18.1863H72.5345V17.965H71.5632V18.1863H71.9117V19.111Z" fill="#007DFA" />
      </g>
    </svg>
  );
}




