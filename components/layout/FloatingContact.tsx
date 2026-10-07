"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, Camera, FileText, Mail, MessageCircle, Phone, Plus, RotateCw, Search, X } from "lucide-react";
import Draggable from "@/components/ui/Draggable";
import { company } from "@/config/site";
import { setDock, useDock } from "@/lib/ui/dock";
import { useTr } from "@/lib/shop/tr";

const base =
  "flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--brand-primary)] shadow-lg transition hover:scale-110 hover:border-[var(--brand-accent)]";

/** Floating dock. Drag it anywhere (snaps to the nearest edge), rotate it, or collapse it. */
export default function FloatingContact() {
  const pathname = usePathname();
  const tr = useTr();
  const { orient, collapsed } = useDock();
  if (pathname.startsWith("/staff")) return null;

  return (
    <Draggable id="dock" className="fixed right-4 top-1/3 z-50 hidden sm:block">
      <div className={`flex items-center gap-2 rounded-full bg-white/80 p-2 shadow-2xl ring-1 ring-slate-200 backdrop-blur ${orient === "v" ? "flex-col" : "flex-row"}`}>
        <button type="button" onClick={() => setDock({ collapsed: !collapsed })} aria-label={collapsed ? tr("Open quick actions", "द्रुत विकल्प खोल्नुहोस्") : tr("Collapse", "सानो बनाउनुहोस्")} className={`${base} bg-[var(--brand-primary)] text-white`}>
          {collapsed ? <Plus size={18} /> : <X size={18} />}
        </button>
        {!collapsed && (
          <>
            <button type="button" onClick={() => setDock({ orient: orient === "v" ? "h" : "v" })} aria-label={tr("Rotate dock", "डक घुमाउनुहोस्")} title={tr("Rotate dock", "डक घुमाउनुहोस्")} className={base}>
              <RotateCw size={18} />
            </button>
            <Link href="/search" aria-label={tr("Search", "खोज्नुहोस्")} title={tr("Search", "खोज्नुहोस्")} className={base}><Search size={18} /></Link>
            <Link href="/search#photo" aria-label={tr("Search by photo", "फोटोबाट खोज्नुहोस्")} title={tr("Search by photo", "फोटोबाट खोज्नुहोस्")} className={base}><Camera size={18} /></Link>
            <a href={`https://wa.me/977${company.contact.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp" className={`${base} !border-emerald-600 !bg-emerald-600 !text-white`}><MessageCircle size={18} /></a>
            <a href={`tel:${company.contact.phoneRaw}`} aria-label={tr("Call", "फोन")} title={tr("Call", "फोन")} className={base}><Phone size={18} /></a>
            <a href={`mailto:${company.contact.email}`} aria-label="Email" title="Email" className={base}><Mail size={18} /></a>
            <Link href="/contact" aria-label={tr("Request a quote", "मूल्य सोध्नुहोस्")} title={tr("Request a quote", "मूल्य सोध्नुहोस्")} className={base}><FileText size={18} /></Link>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={tr("Back to top", "माथि जानुहोस्")} title={tr("Back to top", "माथि जानुहोस्")} className={base}><ArrowUp size={18} /></button>
          </>
        )}
      </div>
    </Draggable>
  );
}