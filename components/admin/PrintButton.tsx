"use client";

export default function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="no-print rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white">Print</button>;
}
