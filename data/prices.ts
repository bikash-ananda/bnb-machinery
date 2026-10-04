/**
 * Prices (in NPR) for the built-in products in data/products.ts.
 * Leave a product out to show "Price on request". Example:
 *   "power-tiller": { price: 185000, mrp: 195000 },
 * Products added through the staff panel use the price stored in Supabase instead.
 */
export const staticPrices: Record<string, { price?: number; mrp?: number }> = {};
