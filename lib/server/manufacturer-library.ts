import "server-only";

import catalog from "@/data/manufacturer-library.json";

export type ManufacturerLibraryItem = (typeof catalog.items)[number];

const items = catalog.items as ManufacturerLibraryItem[];

export const manufacturerLibraryFacets = {
  brands: [...new Set(items.map((item) => item.manufacturer))].sort((a, b) => a.localeCompare(b)),
  categories: [...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b)),
};

export function searchManufacturerLibrary(options: {
  query?: string;
  brand?: string;
  category?: string;
  offset?: number;
  limit?: number;
}) {
  const query = options.query?.trim().toLocaleLowerCase() ?? "";
  const brand = options.brand?.trim().toLocaleLowerCase() ?? "";
  const category = options.category?.trim().toLocaleLowerCase() ?? "";
  const matching = items.filter((item) => {
    if (brand && item.manufacturer.toLocaleLowerCase() !== brand) return false;
    if (category && item.category.toLocaleLowerCase() !== category) return false;
    if (!query) return true;
    return [item.model, item.name, item.manufacturer, item.category, item.description]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query);
  });
  const offset = Math.max(0, Math.min(options.offset ?? 0, 10_000));
  const limit = Math.max(1, Math.min(options.limit ?? 24, 48));
  return { total: matching.length, items: matching.slice(offset, offset + limit) };
}

export function getManufacturerLibraryItem(id: string) {
  return items.find((item) => item.id === id) ?? null;
}
