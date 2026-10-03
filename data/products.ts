export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  model: string;
  partNumber: string;
  description: string;
  specifications: {
    name: string;
    value: string;
  }[];
  applications: string[];
  image: string;
  brochure?: string;
  price: number | null;
  currency: "NPR";
  featured: boolean;
  availability: "In Stock" | "Available on Request" | "Out of Stock";
};

export const products: Product[] = [];