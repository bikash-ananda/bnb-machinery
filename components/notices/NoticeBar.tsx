"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { dismiss, useDismissed } from "@/lib/ui/dismissed";
import { activeNotices } from "@/src/lib/notices";

export default function NoticeBar() {
  const { language } = useLanguage();
  const lang = language === "ne" ? "ne" : "en";
  const hidden = useDismissed("notice-bar");
  const [i, setI] = useState(0);
  const list = hidden ? [] : activeNotices("notice");
  const count = list.length;

  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setI((v) => v + 1), 6000);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;
  const n = list[i % count];
  const cls = "rounded-full bg-amber-400 px-3 py-0.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300";

  return (
    <div role="region" aria-label="Notice" className="relative bg-[var(--brand-primary)] px-10 py-2 text-center text-sm text-white">
      <span key={n.id} className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <b className="text-amber-300">{n.title[lang]}</b>
        <span>{n.text[lang]}</span>
        {n.link && (n.link.href.startsWith("/")
          ? <Link href={n.link.href} className={cls}>{n.link.label[lang]}</Link>
          : <a href={n.link.href} className={cls}>{n.link.label[lang]}</a>)}
      </span>
      <button type="button" onClick={() => dismiss("notice-bar", 12)} aria-label="Close notice" className="absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none text-slate-300 hover:text-white">×</button>
    </div>
  );
}