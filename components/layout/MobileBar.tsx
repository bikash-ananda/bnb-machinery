"use client";
import { usePathname } from "next/navigation";
import { company } from "@/data/company";

export default function MobileBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/staff")) return null;
  const base = "flex min-h-12 flex-1 items-center justify-center gap-2 text-sm font-bold";
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex divide-x divide-white/20 bg-[var(--brand-primary)] text-white shadow-[0_-4px_20px_rgba(0,0,0,.25)] sm:hidden">
      <a href={`tel:${company.contact.phoneRaw}`} className={base}>☎ Call</a>
      <a href={`https://wa.me/977${company.contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className={`${base} bg-emerald-600`}>WhatsApp</a>
      <a href="/location" className={base}>📍 Visit</a>
    </div>
  );
}
