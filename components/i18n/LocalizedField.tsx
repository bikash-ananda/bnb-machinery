"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export function LocalizedField({
  en,
  ne,
  fallback = "",
}: {
  en: string | null | undefined;
  ne: string | null | undefined;
  fallback?: string;
}) {
  const { language } = useLanguage();
  return <>{(language === "ne" ? ne : en) || en || ne || fallback}</>;
}
