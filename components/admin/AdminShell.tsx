"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LogOut, Menu, X } from "lucide-react";

type Nav = { group: string; items: { id: string; label: string; href: string; ready: boolean }[] }[];

export default function AdminShell({ user, nav, children }: { user: { name: string; email: string; roleLabel: string }; nav: Nav; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  async function logout() {
    try { await fetch("/api/admin/auth/logout", { method: "POST" }); } catch {}
    window.location.assign("/admin/login");
  }

  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col overflow-y-auto p-4">
      <Link href="/admin" onClick={() => setOpen(false)} className="mb-6 block px-2">
        <span className="block text-base font-black text-white">Machinery Tools Nepal</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">Admin</span>
      </Link>
      {nav.map((g) => (
        <div key={g.group} className="mb-5">
          <p className="px-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">{g.group}</p>
          <ul className="mt-1 space-y-0.5">
            {g.items.map((it) => (
              <li key={it.id}>
                <Link href={it.href} onClick={() => setOpen(false)} aria-current={active(it.href) ? "page" : undefined}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition ${active(it.href) ? "bg-amber-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                  <span>{it.label}</span>
                  {!it.ready && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">Planned</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="mt-auto space-y-1 border-t border-white/10 pt-4 text-sm">
        <Link href="/admin/change-password" className="block rounded-lg px-3 py-2 font-semibold text-slate-300 hover:bg-white/10">Change password</Link>
        <Link href="/" className="block rounded-lg px-3 py-2 font-semibold text-slate-300 hover:bg-white/10">View website</Link>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[var(--surface)] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-[var(--brand-primary)] lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-[var(--brand-primary)]">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Menu" className="rounded-lg border border-slate-300 p-2 lg:hidden">{open ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-xs text-slate-500">{user.roleLabel}</p>
            </div>
            <button type="button" onClick={logout} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-bold transition hover:border-[var(--brand-accent-strong)] hover:bg-[var(--brand-accent-soft)]"><LogOut size={16} /> Sign out</button>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
