import { describe, expect, it } from "vitest";
import { productKind, searchProducts } from "@/src/lib/search/engine";

const mk = (id: string, name: string, brand: string, category: string) => ({
  id, slug: id, name, brand, category, image: "", price: null,
});
const items = [
  mk("corn-sheller", "Corn Sheller", "B & B Machinery", "Agricultural Machinery"),
  mk("wrench", "Adjustable Wrench", "Deli", "Mechanical Tools"),
  mk("grinder", "Angle Grinder", "Deli", "Power Tools"),
];

describe("search", () => {
  it("finds by Roman Nepali and Devanagari local names", () => {
    expect(searchProducts(items, "makai")[0]?.id).toBe("corn-sheller");
    expect(searchProducts(items, "पाना")[0]?.id).toBe("wrench");
  });
  it("tolerates typos", () => {
    expect(searchProducts(items, "grindr")[0]?.id).toBe("grinder");
  });
  it("finds by brand and ignores empty input", () => {
    expect(searchProducts(items, "deli").length).toBe(2);
    expect(searchProducts(items, "  ")).toEqual([]);
  });
  it("classifies kinds", () => {
    expect(productKind("Power Tools")).toBe("tools");
    expect(productKind("Spare Parts")).toBe("parts");
    expect(productKind("Agricultural Machinery")).toBe("machines");
  });
});