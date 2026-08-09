// ============================================================================
// Small, fixed set of line icons for the sidebar nav. Inline SVG.
// ============================================================================
interface IconProps {
  className?: string;
}
const base = "stroke-current fill-none";
const strokeProps = { strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export function DashboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} {...strokeProps}>
      <rect x="2" y="2" width="6.5" height="6.5" rx="1" className={base} />
      <rect x="9.5" y="2" width="6.5" height="4" rx="1" className={base} />
      <rect x="9.5" y="7.5" width="6.5" height="8.5" rx="1" className={base} />
      <rect x="2" y="9.5" width="6.5" height="6.5" rx="1" className={base} />
    </svg>
  );
}
export function PolicyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} {...strokeProps}>
      <path d="M9 1.5 15 3.5v5c0 4-3 6.5-6 8-3-1.5-6-4-6-8v-5L9 1.5Z" className={base} />
      <path d="M6.3 9 8.3 11l3.4-4" className={base} />
    </svg>
  );
}
export function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} {...strokeProps}>
      <path d="M9 2 14.5 4v4.2c0 3.6-2.4 6-5.5 7.3-3.1-1.3-5.5-3.7-5.5-7.3V4L9 2Z" className={base} />
      <path d="M9 5.5v4" className={base} />
      <circle cx="9" cy="11.5" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function VpnIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} {...strokeProps}>
      <circle cx="4.5" cy="9" r="2.5" className={base} />
      <circle cx="13.5" cy="9" r="2.5" className={base} />
      <path d="M7 9h4" className={base} />
    </svg>
  );
}
export function SdwanIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} {...strokeProps}>
      <circle cx="9" cy="3" r="1.4" className={base} />
      <circle cx="3.5" cy="14" r="1.4" className={base} />
      <circle cx="14.5" cy="14" r="1.4" className={base} />
      <path d="M9 4.4 3.5 12.6M9 4.4l5.5 8.2" className={base} />
    </svg>
  );
}
export function NetworkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} {...strokeProps}>
      <rect x="2" y="2.5" width="14" height="3.5" rx="0.8" className={base} />
      <rect x="2" y="8" width="14" height="3.5" rx="0.8" className={base} />
      <rect x="2" y="13.5" width="14" height="2" rx="0.8" className={base} />
    </svg>
  );
}
export function SystemIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} {...strokeProps}>
      <circle cx="9" cy="9" r="2.4" className={base} />
      <path
        d="M9 2.5v2M9 13.5v2M2.5 9h2M13.5 9h2M4.4 4.4l1.4 1.4M12.2 12.2l1.4 1.4M13.6 4.4l-1.4 1.4M5.8 12.2l-1.4 1.4"
        className={base}
      />
    </svg>
  );
}
export function LogIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} {...strokeProps}>
      <rect x="3" y="2" width="12" height="14" rx="1" className={base} />
      <path d="M6 6h6M6 9h6M6 12h3.5" className={base} />
    </svg>
  );
}
export function UserIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} {...strokeProps}>
      <circle cx="9" cy="6" r="2.6" className={base} />
      <path d="M3.5 15c0-2.8 2.5-4.6 5.5-4.6s5.5 1.8 5.5 4.6" className={base} />
    </svg>
  );
}
export function HardwareIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} {...strokeProps}>
      <rect x="1.5" y="6" width="15" height="6" rx="1" className={base} />
      <path d="M4 6V4.5M7 6V4.5M11 6V4.5M14 6V4.5" className={base} />
      <circle cx="4"  cy="9" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="6.2" cy="9" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="8.4" cy="9" r="0.7" fill="currentColor" stroke="none" />
      <rect x="11" y="7.8" width="3" height="2.4" rx="0.4" className={base} />
    </svg>
  );
}
export const ICONS: Record<string, (props: IconProps) => JSX.Element> = {
  dashboard: DashboardIcon,
  policy: PolicyIcon,
  shield: ShieldIcon,
  vpn: VpnIcon,
  sdwan: SdwanIcon,
  network: NetworkIcon,
  system: SystemIcon,
  log: LogIcon,
  user: UserIcon,
  hardware: HardwareIcon,
};
