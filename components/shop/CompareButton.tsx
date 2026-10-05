"use client";

import { useState } from "react";
import { toggleCompare, useShop } from "@/lib/shop/store";
import { useTr } from "@/lib/shop/tr";

export default function CompareButton({ id, className = "" }: { id: string; className?: string }) {
  const tr = useTr();
  const { compare } = useShop();
  const [full, setFull] = useState(false);
  const on = compare.includes(id);
  return (
    <button type="button" aria-pressed={on} className={className}
      onClick={() => { const ok = toggleCompare(id); setFull(!ok); if (!ok) setTimeout(() => setFull(false), 2000); }}>
      {full ? tr("Max 3 items", "बढीमा ३ वटा") : on ? tr("✓ Comparing", "✓ तुलनामा") : tr("⇄ Compare", "⇄ तुलना")}
    </button>
  );
}
