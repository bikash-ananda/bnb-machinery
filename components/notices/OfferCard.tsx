"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import Draggable from "@/components/ui/Draggable";
import { dismiss, useDismissed } from "@/lib/ui/dismissed";
import { activeNotices } from "@/src/lib/notices";

/** Floating offer card on the home page. Drag it anywhere; close it and it stays away for 12 hours. */
export default function OfferCard() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const lang = language === "ne" ? "ne" : "en";
  const hidden = useDismissed("offer-card");
  if (pathname !== "/" || hidden) return null;
  const n = activeNotices("offer")[0];
  if (!n) return null;

  return (
    <Draggable id="offer" className="fixed right-4 top-28 z-[56] w-72 max-w-[calc(100vw-2rem)]">
      <aside role="complementary" aria-label={n.title[lang]} className="overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-amber-400 px-4 py-2">
          <p className="text-sm font-black text-slate-950">{"\u{1F3F7}\uFE0F"} {n.title[lang]}</p>
          <button type="button" onClick={() => dismiss("offer-card", 12)} aria-label="Close offer" className="text-xl leading-none text-slate-900 hover:text-red-700">×</button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm leading-6 text-slate-700">{n.text[lang]}</p>
          {n.link && (
            <Link href={n.link.href} className="inline-block rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">{n.link.label[lang]}</Link>
          )}
        </div>
      </aside>
    </Draggable>
  );
}