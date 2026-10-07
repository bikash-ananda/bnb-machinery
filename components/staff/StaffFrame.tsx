"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { StaffRole } from "@/lib/inventory/types";

export default function StaffFrame({
  children,
  role,
  email,
}: {
  children: React.ReactNode;
  role: StaffRole;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const pendingHref = role === "OWNER" ? "/staff/review" : "/staff/inventory?status=STAFF_REVIEW";
  const items = [
    { href: "/", label: t("home"), short: t("home") },
    { href: "/staff/inventory", label: t("inventory"), short: t("inventory") },
    { href: "/staff/inventory/new", label: t("addStock"), short: "+" },
    { href: pendingHref, label: t("pending"), short: t("pending") },
    { href: "/staff/profile", label: t("profile"), short: t("profile") },
  ];

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/staff/auth/logout", { method: "POST" });
    } finally {
      router.push("/staff/login");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-24 sm:pb-10">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <Link href="/staff" className="flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-xs font-bold text-white">B&B</span>
            <span>
              <span className="block text-sm font-bold text-[var(--brand-primary)]">Machinery Tools Nepal</span>
              <span className="hidden text-xs text-[var(--text-muted)] sm:block">{t("internalOnly")}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <Link href="/staff/profile" className="hidden max-w-40 truncate text-sm text-slate-700 md:block">
              {role === "OWNER" ? t("owner") : t("accountName")}
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={busy}
              className="min-h-11 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-[var(--brand-primary)] hover:bg-[var(--surface-muted)] disabled:opacity-60"
            >
              {busy ? t("loading") : t("logout")}
            </button>
          </div>
        </div>
      </header>

      <div className="sm:hidden px-4 pt-3"><LanguageSwitcher /></div>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        {children}
      </main>

      <nav
        aria-label={t("accessibleMenu")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href.split("?")[0] ||
                  (item.href.includes("?") && pathname.startsWith("/staff/inventory"));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold " +
                  (active ? "text-amber-700" : "text-slate-600")
                }
              >
                <span aria-hidden="true" className="flex h-6 min-w-6 items-center justify-center text-base">
                  {item.short === "+" ? "+" : item.short.slice(0, 1)}
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="mx-auto hidden max-w-7xl px-4 pt-3 text-center text-xs text-slate-400 sm:block">
        {email}
      </div>
    </div>
  );
}
