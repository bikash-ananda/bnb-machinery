"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { t, type Locale, type MessageKey } from "@/src/i18n";

/** const t = useT(); t("common.save") — follows the visitor's language switch. */
export function useT() {
  const { language } = useLanguage();
  const locale: Locale = language === "ne" ? "ne" : "en";
  return (key: MessageKey, vars?: Record<string, string | number>) => t(locale, key, vars);
}
