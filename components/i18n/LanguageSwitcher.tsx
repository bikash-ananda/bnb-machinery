"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      className="flex items-center rounded-lg border border-[var(--border)] bg-white p-1"
      aria-label={t("language")}
      role="group"
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={
          language === "en"
            ? "min-h-9 rounded-md bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            : "min-h-9 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-[var(--surface-muted)]"
        }
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLanguage("ne")}
        aria-pressed={language === "ne"}
        className={
          language === "ne"
            ? "min-h-9 rounded-md bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            : "min-h-9 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-[var(--surface-muted)]"
        }
      >
        नेपाली
      </button>
    </div>
  );
}
