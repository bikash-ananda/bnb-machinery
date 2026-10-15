export type Availability = "in" | "out" | "ask";

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  nameNe?: string;
  brand: string;
  category: string;
  image: string;
  images: string[];
  description: string;
  model?: string;
  specs: { name: string; value: string }[];
  price: number | null;
  marketPrice?: number | null;
  mrp?: number | null;
  availability: Availability;
  stockQty: number | null;
  featured?: boolean;
  sourceUrl?: string;
  manufacturerUrl?: string;
  sourceName?: string;
  imageCredit?: string;
  priceCheckedOn?: string;
  priceNote?: string;
  marketReference?: boolean;
};

export const npr = (n: number) => "Rs " + n.toLocaleString("en-IN");
export const discountPct = (p: Pick<ShopProduct, "price" | "mrp">) =>
  p.price && p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
