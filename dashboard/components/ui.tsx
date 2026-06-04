'use client';

import type { ReactNode } from 'react';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Hynex Bots" className="h-8 w-8 object-contain" />
      <span className="font-display text-base font-semibold tracking-tightest">
        Hynex<span className="text-mist-muted"> Bots</span>
      </span>
    </div>
  );
}

export function DiscordIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.27 5.33A16.7 16.7 0 0 0 15.1 4l-.2.4a12.6 12.6 0 0 1 3.7 1.9 13.6 13.6 0 0 0-11.2 0 12.6 12.6 0 0 1 3.7-1.9L10.9 4a16.7 16.7 0 0 0-4.17 1.33C3.5 9.06 2.9 12.7 3.2 16.3a16.8 16.8 0 0 0 5.1 2.6l.4-.65a10 10 0 0 1-1.7-.82l.4-.3c3.3 1.55 6.9 1.55 10.2 0l.4.3c-.55.32-1.1.6-1.7.82l.4.65a16.8 16.8 0 0 0 5.1-2.6c.36-4.2-.62-7.8-2.93-10.97ZM9.5 14.3c-.8 0-1.46-.74-1.46-1.65 0-.9.65-1.65 1.46-1.65.82 0 1.48.75 1.46 1.65 0 .91-.65 1.65-1.46 1.65Zm5 0c-.8 0-1.46-.74-1.46-1.65 0-.9.65-1.65 1.46-1.65.82 0 1.48.75 1.46 1.65 0 .91-.64 1.65-1.46 1.65Z" />
    </svg>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  // Compact switch (no surrounding row) when there's no label.
  if (!label) {
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ${
          checked ? 'bg-accent' : 'bg-ink-600'
        }`}
      >
        <span
          className="inline-block transform rounded-full bg-white shadow transition-transform duration-300"
          style={{ height: '1.125rem', width: '1.125rem', transform: checked ? 'translateX(1.25rem)' : 'translateX(0.25rem)' }}
        />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3.5 text-left transition-colors hover:border-ink-600"
    >
      <span>
        <span className="block text-sm font-medium text-mist">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-mist-muted">{hint}</span>}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ${
          checked ? 'bg-accent' : 'bg-ink-600'
        }`}
      >
        <span
          className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform duration-300 ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
          style={{ height: '1.125rem', width: '1.125rem' }}
        />
      </span>
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-mist-muted">{hint}</p>}
    </div>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Z" />
    </svg>
  );
}
