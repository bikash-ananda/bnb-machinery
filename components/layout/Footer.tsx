import Link from "next/link";
import { company } from "@/data/company";
import { LocalizedText } from "@/components/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";

const quickLinks = [
  { label: "about", href: "/about" },
  { label: "products", href: "/products" },
  { label: "brands", href: "/brands" },
  { label: "services", href: "/services" },
  { label: "gallery", href: "/gallery" },
  { label: "contact", href: "/contact" },
  { label: "location", href: "/location" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--brand-primary)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Company */}
          <div>
            <div className="mb-4 text-xl font-bold">
              {company.name}
            </div>

            <p className="max-w-md text-sm leading-6 text-slate-300">
              <LocalizedText id="footerDescription" />
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={`https://wa.me/${company.contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                WhatsApp
              </a>

              <a
                href={`viber://chat?number=%2B977${company.contact.viber}`}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                Viber
              </a>

              {company.social.tiktok && (
                <a
                  href={company.social.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
                >
                  TikTok
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-200">
              <LocalizedText id="quickLinks" />
            </h2>

            <nav className="grid grid-cols-2 gap-3 text-sm text-slate-300">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-[var(--brand-accent)]"
                >
                  <LocalizedText id={link.label as MessageKey} />
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-200">
              <LocalizedText id="contact" />
            </h2>

            <div className="space-y-3 text-sm leading-6 text-slate-300">
              <p>
                <span className="block text-xs uppercase tracking-wide text-slate-500">
                  <LocalizedText id="location" />
                </span>
                {company.location.address}, {company.location.city}
              </p>

              <p>
                <span className="block text-xs uppercase tracking-wide text-slate-500">
                  <LocalizedText id="phone" />
                </span>

                <a
                  href={`tel:${company.contact.phoneRaw}`}
                  className="transition-colors hover:text-[var(--brand-accent)]"
                >
                  {company.contact.phone}
                </a>
              </p>

              <p>
                <span className="block text-xs uppercase tracking-wide text-slate-500">
                  <LocalizedText id="email" />
                </span>

                <a
                  href={`mailto:${company.contact.email}`}
                  className="break-all transition-colors hover:text-[var(--brand-accent)]"
                >
                  {company.contact.email}
                </a>
              </p>
            </div>
          </div>

          {/* Social & Direct Contact */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-200">
              <LocalizedText id="connectUs" />
            </h2>

            <div className="space-y-3">
              <a
                href={`https://wa.me/${company.contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-bold">
                  W
                </span>

                <span>
                  <span className="block font-semibold text-white">
                    WhatsApp
                  </span>
                  <span className="text-xs text-slate-400">
                    {company.contact.whatsapp}
                  </span>
                </span>
              </a>

              <a
                href={`viber://chat?number=%2B977${company.contact.viber}`}
                className="flex items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-bold">
                  V
                </span>

                <span>
                  <span className="block font-semibold text-white">
                    Viber
                  </span>
                  <span className="text-xs text-slate-400">
                    {company.contact.viber}
                  </span>
                </span>
              </a>

              {company.social.tiktok && (
                <a
                  href={company.social.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-white/20 hover:text-white"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 font-bold">
                    ♪
                  </span>

                  <span>
                    <span className="block font-semibold text-white">
                      TikTok
                    </span>
                    <span className="text-xs text-slate-400">
                      @bandbmachinerysuppliers
                    </span>
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {company.name}. <LocalizedText id="rightsReserved" />
            </p>

            <p>
              <LocalizedText id="machineryParts" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
