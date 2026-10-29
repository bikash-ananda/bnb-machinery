import { describe, expect, it } from "vitest";
import { moneyInput, parseCatalogInput, slugify } from "./admin";

const valid = {
  sku: " pump-001 ", nameEn: "Water Pump", unit: "pcs", price: "1250.50", mrp: "1500.00",
  cost: "900", reorderLevel: "3", trackStock: true, priceIncludesVat: true, vatApplicable: true,
  taxCategory: "STANDARD", specs: [{ name: "Power", value: "2 HP" }],
  images: ["https://images.example.com/pump.jpg"],
};

describe("catalog input validation", () => {
  it("normalizes SKU and parses money to integer paisa", () => {
    const parsed = parseCatalogInput(valid);
    expect(parsed.sku).toBe("PUMP-001");
    expect(parsed.pricePaisa).toBe(125050n);
    expect(parsed.mrpPaisa).toBe(150000n);
    expect(parsed.costPaisa).toBe(90000n);
    expect(parsed.trackStock).toBe(true);
  });

  it("allows quote-only products without a price", () => {
    const parsed = parseCatalogInput({ sku: "QUOTE-1", nameEn: "Custom machine", price: "" });
    expect(parsed.pricePaisa).toBeNull();
  });

  it("rejects duplicate/invalid SKU formats", () => {
    expect(() => parseCatalogInput({ sku: "bad sku", nameEn: "Pump" })).toThrow(/SKU/);
  });

  it("rejects negative amounts, excessive decimal places, and MRP below price", () => {
    expect(() => parseCatalogInput({ sku: "P1", nameEn: "Pump", price: "-1" })).toThrow(/non-negative/);
    expect(() => parseCatalogInput({ sku: "P1", nameEn: "Pump", price: "1.234" })).toThrow(/two decimal places/);
    expect(() => parseCatalogInput({ sku: "P1", nameEn: "Pump", price: "100", mrp: "99" })).toThrow(/MRP/);
  });

  it("rejects non-HTTPS, credentials-in-URL, and too many images", () => {
    expect(() => parseCatalogInput({ sku: "P1", nameEn: "Pump", images: ["http://example.com/a.jpg"] })).toThrow(/HTTPS/);
    expect(() => parseCatalogInput({ sku: "P1", nameEn: "Pump", images: ["https://user:pass@example.com/a.jpg"] })).toThrow(/HTTPS/);
    expect(() => parseCatalogInput({ sku: "P1", nameEn: "Pump", images: Array(9).fill("https://example.com/a.jpg") })).toThrow(/eight/);
  });

  it("bounds specifications and rejects malformed rows", () => {
    expect(() => parseCatalogInput({ sku: "P1", nameEn: "Pump", specs: Array(51).fill({ name: "x", value: "y" }) })).toThrow(/50/);
    expect(() => parseCatalogInput({ sku: "P1", nameEn: "Pump", specs: [{ name: "", value: "x" }] })).toThrow(/required/);
  });

  it("validates tax flags, stock thresholds, and image duplicates", () => {
    expect(() => parseCatalogInput({ sku: "P1", nameEn: "Pump", taxCategory: "INVALID" })).toThrow(/tax category/);
    expect(() => parseCatalogInput({ sku: "P1", nameEn: "Pump", reorderLevel: -1 })).toThrow(/Reorder level/);
    expect(() => parseCatalogInput({ sku: "P1", nameEn: "Pump", images: ["https://example.com/a.jpg", "https://example.com/a.jpg"] })).toThrow(/duplicate/);
  });

  it("creates stable readable slugs and formats paisa safely", () => {
    expect(slugify("Water Pump 2 HP")).toBe("water-pump-2-hp");
    expect(moneyInput(123456n)).toBe("1234.56");
    expect(moneyInput(null)).toBe("");
  });
});
