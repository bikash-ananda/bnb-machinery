"use client";

import Link from "next/link";
import SmartSearch from "@/components/search/SmartSearch";
import { useState } from "react";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import SafeImage from "@/components/ui/SafeImage";
import { company } from "@/config/site";
import { distribution } from "@/config/brand";
import { cartCount, setDrawer, useShop } from "@/lib/shop/store";
import { useTr } from "@/lib/shop/tr";
import type { MessageKey } from "@/lib/i18n/messages";

const navigation: { key: MessageKey; href: string }[] = [
  { key: "home", href: "/" },
  { key: "products", href: "/products" },
  { key: "brands", href: "/brands" },
  { key: "services", href: "/services" },
  { key: "about", href: "/about" },
  { key: "gallery", href: "/gallery" },
  { key: "contact", href: "/contact" },
];

const link =
  "text-sm font-semibold text-slate-700 transition-colors hover:text-[var(--brand-accent)] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-accent)]";

function SearchBox({ className = "" }: { className?: string }) {
  return <SmartSearch className={className} />;
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLanguage();
  const tr = useTr();
  const shop = useShop();
  const count = cartCount(shop);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/95 backdrop-blur">
      <div className="hidden bg-[var(--brand-primary)] text-xs text-slate-200 sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-1.5 lg:px-8">
          <Link href="/brands/deli" className="font-semibold text-amber-300 hover:text-amber-200">
            {tr(`${distribution.roleEn} · ${distribution.regionsEn.join(" & ")}`, `${distribution.roleNe} · ${distribution.regionsNe.join(" र ")}`)}
          </Link>
          <a href={`tel:${company.contact.phoneRaw}`} className="hover:text-white">{company.contact.phone}</a>
        </div>
      </div>

      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/staff/login"
          onClick={() => setMobileOpen(false)}
          title={t("staffLogin")}
          aria-label={"B & B Machinery · " + t("staffLogin")}
          className="group relative flex min-h-12 min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-accent)]"
        >
          <SafeImage src="/images/logo.jpg" alt="" contain className="h-11 w-11 shrink-0 rounded-full border border-slate-200 bg-white" />
          <span className="min-w-0">
            <span className="block truncate text-base font-bold tracking-tight text-[var(--brand-primary)] sm:text-lg">B & B Machinery</span>
            <span className="hidden text-xs text-[var(--text-muted)] sm:block">{t("machineryParts")}</span>
          </span>
        </Link>

        <SearchBox className="hidden max-w-md flex-1 xl:flex" />

        <div className="flex items-center gap-2">
          <div className="hidden lg:block"><LanguageSwitcher /></div>
          <Link href="/saved" aria-label={tr("Saved items", "सुरक्षित वस्तुहरू")} className="hidden h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] text-lg text-[var(--brand-primary)] hover:border-[var(--brand-accent)] sm:flex">
            <span aria-hidden="true">♡</span>
          </Link>
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label={tr("Open cart", "कार्ट खोल्नुहोस्") + ` (${count})`}
            className="relative flex h-11 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-bold text-[var(--brand-primary)] hover:border-[var(--brand-accent)]"
          >
            <span aria-hidden="true">🛒</span>
            <span className="hidden sm:inline">{tr("Cart", "कार्ट")}</span>
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-accent)] px-1 text-[11px] font-black text-slate-950">{count}</span>
            )}
          </button>
          <Link href="/contact" className="hidden rounded-lg bg-[var(--brand-accent)] px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 lg:block">
            {t("getQuote")}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((c) => !c)}
            aria-label={mobileOpen ? t("closeNavigation") : t("openNavigation")}
            aria-expanded={mobileOpen}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] text-xl text-[var(--brand-primary)] lg:hidden"
          >
            <span aria-hidden="true">{mobileOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      <div className="hidden border-t border-[var(--border)] lg:block">
        <nav aria-label={t("accessibleMenu")} className="mx-auto flex max-w-7xl items-center gap-7 px-6 py-2.5 lg:px-8">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className={link}>{t(item.key)}</Link>
          ))}
          <Link href="/brands/deli" className="ml-auto text-sm font-bold text-[var(--brand-accent)] hover:text-amber-600">Deli</Link>
        </nav>
      </div>

      <div className="px-4 pb-3 sm:px-6 xl:hidden"><SearchBox /></div>

      {mobileOpen && (
        <div className="border-t border-[var(--border)] bg-white lg:hidden">
          <nav aria-label={t("accessibleMenu")} className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="flex min-h-12 items-center rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-[var(--surface)] hover:text-[var(--brand-primary)]">
                  {t(item.key)}
                </Link>
              ))}
              <Link href="/brands/deli" onClick={() => setMobileOpen(false)} className="flex min-h-12 items-center rounded-lg px-4 py-3 text-sm font-bold text-[var(--brand-accent)]">Deli</Link>
              <Link href="/saved" onClick={() => setMobileOpen(false)} className="flex min-h-12 items-center rounded-lg px-4 py-3 text-sm font-medium text-slate-700 hover:bg-[var(--surface)]">♡ {tr("Saved items", "सुरक्षित वस्तुहरू")}</Link>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <LanguageSwitcher />
              <Link href="/contact" onClick={() => setMobileOpen(false)} className="flex min-h-12 flex-1 items-center justify-center rounded-lg bg-[var(--brand-accent)] px-5 text-sm font-bold text-slate-950">
                {t("getQuote")}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}