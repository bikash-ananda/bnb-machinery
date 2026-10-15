import { marketCatalog } from "./market-catalog";

export type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  image: string;
  description: string;
  featured?: boolean;
  href?: string;
  model?: string;
  specs?: { name: string; value: string }[];
  price?: number;
  mrp?: number;
  sourceUrl?: string;
  manufacturerUrl?: string;
  sourceName?: string;
  imageCredit?: string;
  priceCheckedOn?: string;
  priceNote?: string;
  marketReference?: boolean;
};

const localProducts: Product[] = [
  {
    id: "corn-sheller",
    name: "Corn Sheller",
    category: "Agricultural Machinery",
    brand: "Machinery Tools Nepal",
    image: "",
    description:
      "Agricultural machinery for efficient maize shelling and processing.",
    featured: true,
  },

  {
    id: "self-propelled-reaper",
    name: "Self Propelled Reaper",
    category: "Agricultural Machinery",
    brand: "Machinery Tools Nepal",
    image: "/images/IMG-20261004-WA0000.jpg",
    description:
      "Compact agricultural harvesting machinery designed for efficient field operation.",
    featured: true,
  },

  {
    id: "power-tiller",
    name: "Power Tiller",
    category: "Agricultural Machinery",
    brand: "Machinery Tools Nepal",
    image: "/images/IMG-20261004-WA0007.jpg",
    description:
      "Versatile agricultural machinery for cultivation and field preparation.",
    featured: true,
  },

  {
    id: "cordless-tool-kit",
    name: "Cordless Multi-Tool Kit",
    category: "Power Tools",
    brand: "Machinery Tools Nepal",
    image: "",
    description:
      "Multi-purpose cordless tools for workshop, maintenance and mechanical work.",
    featured: true,
  },

  {
    id: "chainsaw",
    name: "Chainsaw",
    category: "Power Tools",
    brand: "Machinery Tools Nepal",
    image: "",
    description:
      "Power equipment for cutting and outdoor mechanical applications.",
    featured: true,
  },

  {
    id: "mechanical-tools",
    name: "Mechanical Tools",
    category: "Mechanical Tools",
    brand: "Machinery Tools Nepal",
    image: "",
    description:
      "Mechanical tools and equipment for workshops and technical work.",
    featured: true,
  },

  {
    id: "machinery",
    name: "Machinery Equipment",
    category: "Machinery",
    brand: "Machinery Tools Nepal",
    image: "",
    description:
      "Machinery and equipment for agricultural, construction and industrial applications.",
    featured: true,
  },
];

export const products: Product[] = [...localProducts, ...marketCatalog];

export const productCategories = [
  "Agricultural Machinery",
  "Machinery",
  "Power Tools",
  "Mechanical Tools",
  "Spare Parts",
  "Workshop Equipment",
];
