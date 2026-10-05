import en from "@/locales/en.json";
import ne from "@/locales/ne.json";

export type Locale = "en" | "ne";
export const locales: readonly Locale[] = ["en", "ne"];
export type MessageKey = keyof typeof en;

const dictionaries: Record<Locale, Record<string, string>> = { en, ne };

/** t("ne", "invoice.vat", { rate: 13 }) -> "मू.अ.कर (13%)". Falls back to English, then to the key itself. */
export function t(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const raw = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`)) : raw;
}
