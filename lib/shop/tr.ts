"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

/** tr("English", "नेपाली") returns the text for the visitor's current language. */
export function useTr() {
  const { language } = useLanguage();
  return (en: string, ne: string) => (language === "ne" ? ne : en);
}
