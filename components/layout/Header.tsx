"use client";

import Link from "next/link";
import { useState } from "react";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import SafeImage from "@/components/ui/SafeImage";
import type { MessageKey } from "@/lib/i18n/messages";

const navigation: { key: MessageKey; href: string }[] = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "products", href: "/products" },
  { key: "brands", href: "/brands" },
  { key: "services", href: "/services" },
  { key: "gallery", href: "/gallery" },
  { key: "contact", href: "/contact" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/staff/login"
          onClick={() => setMobileOpen(false)}
          title={t("staffLogin")}
          aria-label={"B & B Machinery · " + t("staffLogin")}
          className="group relative flex min-h-12 min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-accent)]"
        >
          <SafeImage
            src="/images/logo.jpg"
            alt=""
            contain
            className="h-11 w-11 shrink-0 rounded-full border border-slate-200 bg-white"
          />
          <span className="min-w-0">
            <span className="block truncate text-base font-bold tracking-tight text-[var(--brand-primary)] sm:text-lg">
              B & B Machinery
            </span>
            <span className="hidden text-xs text-[var(--text-muted)] sm:block">
              {t("machineryParts")}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2.5 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            {t("staffLogin")}
          </span>
        </Link>

        <nav aria-label={t("accessibleMenu")} className="hidden items-center gap-5 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-700 transition-colors hover:text-[var(--brand-accent)] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-accent)]"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <Link
            href="/contact"
            className="rounded-lg bg-[var(--brand-accent)] px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
          >
            {t("getQuote")}
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label={mobileOpen ? t("closeNavigation") : t("openNavigation")}
            aria-expanded={mobileOpen}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] text-xl text-[var(--brand-primary)]"
          >
            <span aria-hidden="true">{mobileOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--border)] bg-white lg:hidden">
          <nav aria-label={t("accessibleMenu")} className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-12 items-center rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-[var(--surface)] hover:text-[var(--brand-primary)]"
                >
                  {t(item.key)}
                </Link>
              ))}
            </div>
            <Link
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className="mt-3 flex min-h-12 items-center justify-center rounded-lg bg-[var(--brand-accent)] px-5 py-3.5 text-sm font-semibold text-slate-950"
            >
              {t("getQuote")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
