"use client";

import { company } from "@/data/company";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function FloatingContact() {
  const pathname = usePathname();
  const { t } = useLanguage();
  if (pathname.startsWith("/staff")) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 hidden items-center gap-2 sm:flex">
      <a
        href={`https://wa.me/${company.contact.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("contact") + " B & B Machinery on WhatsApp"}
        className="flex h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-slate-800 shadow-lg transition-transform hover:scale-105"
      >
        <span className="font-bold">W</span>
        WhatsApp
      </a>

      <a
        href={`viber://chat?number=%2B977${company.contact.viber}`}
        aria-label={t("contact") + " B & B Machinery on Viber"}
        className="flex h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-slate-800 shadow-lg transition-transform hover:scale-105"
      >
        <span className="font-bold">V</span>
        Viber
      </a>

      <a
        href={`tel:${company.contact.phoneRaw}`}
        aria-label={t("contact") + " B & B Machinery"}
        className="flex h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-slate-800 shadow-lg transition-transform hover:scale-105"
      >
        <span className="font-bold">☎</span>
        Call
      </a>
    </div>
  );
}
