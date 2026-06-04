/** Minimal inline icon set — stroke-based, matches the refined aesthetic. */
type P = { className?: string };
const base = 'h-5 w-5';

export const Icons = {
  spec: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className ?? base} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M4 12h10M4 17h7" />
      <circle cx="18" cy="15" r="3" />
    </svg>
  ),
  rocket: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className ?? base} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2" />
      <path d="M9 11a16 16 0 0 1 9-8c2 5-1 11-6 15l-3-3-2-2 2-2Z" />
      <circle cx="14.5" cy="9.5" r="1.5" />
    </svg>
  ),
  pulse: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className ?? base} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </svg>
  ),
  shield: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className ?? base} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  check: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className ?? base} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5L20 7" />
    </svg>
  ),
  arrow: (p: P) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className ?? base} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  discord: (p: P) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={p.className ?? base}>
      <path d="M19.27 5.33A16.7 16.7 0 0 0 15.1 4l-.2.4a12.6 12.6 0 0 1 3.7 1.9 13.6 13.6 0 0 0-11.2 0 12.6 12.6 0 0 1 3.7-1.9L10.9 4a16.7 16.7 0 0 0-4.17 1.33C3.5 9.06 2.9 12.7 3.2 16.3a16.8 16.8 0 0 0 5.1 2.6l.4-.65a10 10 0 0 1-1.7-.82l.4-.3c3.3 1.55 6.9 1.55 10.2 0l.4.3c-.55.32-1.1.6-1.7.82l.4.65a16.8 16.8 0 0 0 5.1-2.6c.36-4.2-.62-7.8-2.93-10.97ZM9.5 14.3c-.8 0-1.46-.74-1.46-1.65 0-.9.65-1.65 1.46-1.65.82 0 1.48.75 1.46 1.65 0 .91-.65 1.65-1.46 1.65Zm5 0c-.8 0-1.46-.74-1.46-1.65 0-.9.65-1.65 1.46-1.65.82 0 1.48.75 1.46 1.65 0 .91-.64 1.65-1.46 1.65Z" />
    </svg>
  ),
};
