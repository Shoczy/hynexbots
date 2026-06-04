export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Hynex Bots" className="h-9 w-9 object-contain" />
      <span className="font-display text-lg font-semibold tracking-tightest text-mist">
        Hynex<span className="text-mist-muted"> Bots</span>
      </span>
    </div>
  );
}
