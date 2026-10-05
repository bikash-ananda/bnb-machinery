"use client";

import { useTr } from "@/lib/shop/tr";

export default function Tx({ en, ne }: { en: string; ne: string }) {
  const tr = useTr();
  return <>{tr(en, ne)}</>;
}
