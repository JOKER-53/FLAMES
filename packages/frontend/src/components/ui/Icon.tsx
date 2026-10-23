// Stroke icons on a 24px grid (Lucide-style geometry). One component, looked up
// by name, so pages never fall back to emoji for iconography.

const PATHS = {
  chevronUp: "m6 15 6-6 6 6",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5",
  moon: "M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  book: "M4 19.5V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 22h13v-4",
  shield: "M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z",
  shieldCheck: "M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z M9 12l2 2 4-4",
  network: "M9 3h6v5H9z M3 16h6v5H3z M15 16h6v5h-6z M12 8v4 M6 16v-2h12v2",
  plug: "M9 2v6 M15 2v6 M6 8h12v3a6 6 0 0 1-12 0z M12 17v5",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M8 17h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16",
  server: "M3 4h18v6H3z M3 14h18v6H3z M7 7h.01 M7 17h.01",
  layers: "m12 2 10 5-10 5L2 7z M2 12l10 5 10-5 M2 17l10 5 10-5",
  swap: "M4 8h14l-4-4 M20 16H6l4 4",
  app: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M17 14v6 M14 17h6",
  check: "M5 12.5 10 17 19 7",
  checkCircle: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M8 12.5l2.7 2.5L16 9.5",
  circle: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
  circleDot: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  lock: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 7v5l3 2",
  chevronRight: "m9 6 6 6-6 6",
  chevronLeft: "m15 6-6 6 6 6",
  chevronDown: "m6 9 6 6 6-6",
  arrowRight: "M5 12h14 M13 6l6 6-6 6",
  arrowLeft: "M19 12H5 M11 6l-6 6 6 6",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  x: "M6 6l12 12 M18 6 6 18",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21a8 8 0 0 1 16 0",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M2 21a7 7 0 0 1 14 0 M16 3.5a4 4 0 0 1 0 7.5 M18 14a6 6 0 0 1 4 7",
  flag: "M5 22V4 M5 4h11l-2 4 2 4H5",
  target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  lightbulb: "M9 18h6 M10 22h4 M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 16v-4 M12 8h.01",
  alert: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z M12 9v4 M12 17h.01",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  play: "M7 4v16l13-8z",
  refresh: "M3 12a9 9 0 0 1 15.5-6.2L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15.5 6.2L3 16 M3 21v-5h5",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  bookOpen: "M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  external: "M15 3h6v6 M10 14 21 3 M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
  plus: "M12 5v14 M5 12h14",
  trash: "M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6",
  edit: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  filter: "M3 4h18l-7 8.5V19l-4 2v-8.5z",
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  title?: string;
}

export function Icon({ name, size = 16, className, strokeWidth = 1.75, title }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  );
}
