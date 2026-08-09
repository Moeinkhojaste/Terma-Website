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
    <svg aria-hidden="true" className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 8c5 4 8 4 11 0s6-4 11 0M5 16c5 4 8 4 11 0s6-4 11 0M5 24c5 4 8 4 11 0s6-4 11 0" strokeLinecap="round" />
    </svg>
  );
}

export function FabricIcon({ className = "size-7" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 7h20v18H6z" /><path d="m6 13 6-6m-6 12L18 7M8 25 26 7M14 25l12-12m-6 12 6-6" />
    </svg>
  );
}

export function PaisleyIcon({ className = "size-7" }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M18 4c1 7 9 7 9 16 0 5-4 8-9 8-7 0-12-5-12-11 0-5 3-9 8-10-1 5 0 9 4 10 3 1 5-1 5-4 0-4-3-6-5-9Z" strokeLinejoin="round" />
      <circle cx="16" cy="21" r="2.5" />
    </svg>
  );
}
