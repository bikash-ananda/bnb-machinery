import { describe, expect, it } from "vitest";
import en from "@/locales/en.json";
import ne from "@/locales/ne.json";
import { t } from "@/src/i18n";

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

describe("i18n", () => {
  it("English and Nepali have exactly the same keys (a missing translation fails CI)", () => {
    expect(Object.keys(ne).sort()).toEqual(Object.keys(en).sort());
  });

  it("every translation keeps the same {placeholders} as English", () => {
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(ne[k]), k).toBe(placeholders(en[k]));
    }
  });

  it("no translation is empty", () => {
    for (const v of [...Object.values(en), ...Object.values(ne)]) expect(v.trim().length).toBeGreaterThan(0);
  });

  it("translates and fills variables", () => {
    expect(t("en", "invoice.vat", { rate: 13 })).toBe("VAT (13%)");
    expect(t("ne", "invoice.title")).toBe("कर बीजक");
  });
});
