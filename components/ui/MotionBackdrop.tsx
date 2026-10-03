export type BackdropVariant = "gears" | "farm" | "workshop" | "tools" | "road";

function Gear({ pos, spin, color = "text-amber-400/25" }: { pos: string; spin: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`absolute ${color} ${pos}`} fill="none" stroke="currentColor">
      <g className={spin}>
        <circle cx="50" cy="50" r="40" strokeWidth="12" strokeDasharray="9.2 8" />
        <circle cx="50" cy="50" r="33" strokeWidth="3" />
        <circle cx="50" cy="50" r="10" strokeWidth="4" />
        {[0, 60, 120].map((a) => (
          <line key={a} x1="50" y1="17" x2="50" y2="83" strokeWidth="3" transform={`rotate(${a} 50 50)`} />
        ))}
      </g>
    </svg>
  );
}

function Tractor() {
  return (
    <svg viewBox="0 0 220 120" className="h-24 w-44 sm:h-28 sm:w-52">
      <rect x="120" y="50" width="78" height="26" rx="6" fill="#f59e0b" />
      <rect x="70" y="52" width="70" height="24" rx="4" fill="#d97706" />
      <rect x="72" y="14" width="52" height="40" rx="5" fill="#1e293b" />
      <rect x="78" y="20" width="40" height="22" rx="3" fill="#7dd3fc" opacity="0.55" />
      <rect x="186" y="28" width="6" height="24" fill="#94a3b8" />
      <g className="bnb-spin-fast"><circle cx="66" cy="86" r="30" fill="#0f172a" stroke="#fbbf24" strokeWidth="4" strokeDasharray="7 5" />
        <circle cx="66" cy="86" r="12" fill="#f59e0b" /><line x1="66" y1="62" x2="66" y2="110" stroke="#0f172a" strokeWidth="3" /></g>
      <g className="bnb-spin-fast"><circle cx="172" cy="98" r="17" fill="#0f172a" stroke="#fbbf24" strokeWidth="3" strokeDasharray="5 4" />
        <circle cx="172" cy="98" r="6" fill="#f59e0b" /></g>
    </svg>
  );
}

const stalks = Array.from({ length: 64 }, (_, i) => i);
const dots = Array.from({ length: 16 }, (_, i) => i);
const icons = ["\u{1F527}", "\u2699\uFE0F", "\u{1F529}", "\u{1F6E0}\uFE0F", "\u{1F69C}", "\u{1FA9A}", "\u{1F527}", "\u2699\uFE0F", "\u{1F529}", "\u{1F6E0}\uFE0F", "\u{1F69C}", "\u{1FA9A}"];

export default function MotionBackdrop({ variant }: { variant: BackdropVariant }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {variant === "gears" && (
        <>
          <Gear pos="-right-10 -top-10 h-80 w-80" spin="bnb-spin" />
          <Gear pos="right-52 top-40 h-44 w-44" spin="bnb-spin-rev" color="text-sky-400/20" />
          <Gear pos="-left-12 bottom-0 h-64 w-64" spin="bnb-spin-rev" color="text-amber-400/15" />
        </>
      )}

      {variant === "farm" && (
        <>
          <div className="absolute right-10 top-8 h-24 w-24 animate-pulse rounded-full bg-amber-300/40 blur-xl" />
          <div className="bnb-cloud absolute left-0 top-10 h-8 w-40 rounded-full bg-white/10 blur-md" style={{ animationDelay: "-10s" }} />
          <div className="bnb-cloud absolute left-0 top-24 h-6 w-28 rounded-full bg-white/10 blur-md" style={{ animationDuration: "95s", animationDelay: "-50s" }} />
          <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="absolute bottom-0 h-40 w-full">
            <path d="M0 120 Q200 40 420 100 T860 90 T1200 110 V200 H0Z" fill="#14532d" opacity="0.55" />
            <path d="M0 150 Q260 90 520 140 T1200 130 V200 H0Z" fill="#166534" opacity="0.7" />
          </svg>
          <div className="bnb-drive absolute bottom-6 left-0" style={{ animationDuration: "24s" }}><Tractor /></div>
          <svg viewBox="0 0 400 70" preserveAspectRatio="xMidYMax slice" className="absolute bottom-0 h-16 w-full">
            {stalks.map((i) => {
              const x = 3 + i * 6.2;
              return (
                <g key={i} className="bnb-sway" style={{ animationDelay: `${-(i % 9) * 0.35}s` }}>
                  <line x1={x} y1="70" x2={x} y2="22" stroke="#d97706" strokeWidth="1.2" />
                  <ellipse cx={x} cy="18" rx="2.3" ry="6.5" fill="#fbbf24" />
                  <ellipse cx={x - 2} cy="26" rx="1.6" ry="4.5" fill="#f59e0b" transform={`rotate(-25 ${x - 2} 26)`} />
                  <ellipse cx={x + 2} cy="26" rx="1.6" ry="4.5" fill="#f59e0b" transform={`rotate(25 ${x + 2} 26)`} />
                </g>
              );
            })}
          </svg>
        </>
      )}

      {variant === "workshop" && (
        <>
          <Gear pos="-right-8 -top-8 h-72 w-72" spin="bnb-spin" />
          <Gear pos="right-60 top-32 h-36 w-36" spin="bnb-spin-rev" color="text-sky-400/20" />
          <Gear pos="right-28 top-52 h-24 w-24" spin="bnb-spin" color="text-amber-300/20" />
          {dots.map((i) => (
            <span key={i} className="bnb-rise absolute bottom-3 h-1.5 w-1.5 rounded-full bg-amber-300" style={{ left: `${(i * 37 + 7) % 100}%`, animationDelay: `${-i * 1.1}s`, animationDuration: `${6 + (i % 5)}s` }} />
          ))}
          {[0, 1, 2].map((i) => (
            <div key={i} className="bnb-drive absolute bottom-4 h-7 w-7 rounded bg-amber-400/40" style={{ animationDuration: "12s", animationDelay: `${-i * 4}s` }} />
          ))}
          <div className="bnb-belt absolute inset-x-0 bottom-0 h-3" />
        </>
      )}

      {variant === "tools" && (
        <>
          {icons.map((ic, i) => (
            <span key={i} className="bnb-rise absolute -bottom-10 opacity-0" style={{ left: `${(i * 8.3 + 3) % 100}%`, fontSize: `${26 + (i % 4) * 8}px`, animationDuration: `${16 + (i % 5) * 3}s`, animationDelay: `${-i * 2.3}s` }}>{ic}</span>
          ))}
        </>
      )}

      {variant === "road" && (
        <>
          <svg viewBox="0 0 100 100" className="absolute right-10 top-10 h-48 w-48 text-amber-400">
            {[0, 1, 2].map((i) => (
              <circle key={i} cx="50" cy="60" r="20" fill="none" stroke="currentColor" strokeWidth="2" className="bnb-pulse" style={{ animationDelay: `${i}s` }} />
            ))}
            <path d="M50 78 C32 56 32 34 50 34 C68 34 68 56 50 78Z" fill="currentColor" />
            <circle cx="50" cy="48" r="6" fill="#07111f" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 h-12 bg-slate-800/70" />
          <div className="bnb-road absolute inset-x-0 bottom-5 h-1" />
          <div className="bnb-drive absolute bottom-10 left-0 text-4xl" style={{ animationDuration: "16s" }}>{"\u{1F69A}"}</div>
        </>
      )}
    </div>
  );
}