export default function Stars({ value, size = "text-base" }: { value: number; size?: string }) {
  const pct = Math.max(0, Math.min(5, value)) * 20;
  return (
    <span className={`relative inline-block whitespace-nowrap leading-none text-slate-300 ${size}`} role="img" aria-label={`${value.toFixed(1)} out of 5`}>
      ★★★★★
      <span className="absolute inset-y-0 left-0 overflow-hidden text-amber-400" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}