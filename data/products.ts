export type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  image: string;
  description: string;
  featured?: boolean;
};

export const products: Product[] = [
  {
    id: "corn-sheller",
    name: "Corn Sheller",
    category: "Agricultural Machinery",
    brand: "B&B Machinery",
    image:
      "https://krishibajar.com/assets/products/maxresdefault.jpg",
    description:
      "Agricultural machinery for efficient maize shelling and processing.",
    featured: true,
  },

  {
    id: "self-propelled-reaper",
    name: "Self Propelled Reaper",
    category: "Agricultural Machinery",
    brand: "B&B Machinery",
    image:
      "https://nthagrizone.com/media/equipment/images/Self_Propelled_Reaper.png",
    description:
      "Compact agricultural harvesting machinery designed for efficient field operation.",
    featured: true,
  },

  {
    id: "power-tiller",
    name: "Power Tiller",
    category: "Agricultural Machinery",
    brand: "B&B Machinery",
    image:
      "https://hardwarepasal.com/src/img/product//2026-05-17-12-49-15_zUSikssJj6product.jpg",
    description:
      "Versatile agricultural machinery for cultivation and field preparation.",
    featured: true,
  },

  {
    id: "cordless-tool-kit",
    name: "Cordless Multi-Tool Kit",
    category: "Power Tools",
    brand: "B&B Machinery",
    image:
      "https://hardwarepasal.com/src/img/product//2024-08-19-11-40-56_HOodVrQ27zproduct.webp",
    description:
      "Multi-purpose cordless tools for workshop, maintenance and mechanical work.",
    featured: true,
  },

  {
    id: "chainsaw",
    name: "Chainsaw",
    category: "Power Tools",
    brand: "B&B Machinery",
    image:
      "https://article.images.consumerreports.org/image/upload/t_article_tout/v1480959896/prod/content/dam/cro/news_articles/home_garden/CR-BG-Chainsaw-Hero-08-16-Crop",
    description:
      "Power equipment for cutting and outdoor mechanical applications.",
    featured: true,
  },

  {
    id: "mechanical-tools",
    name: "Mechanical Tools",
    category: "Mechanical Tools",
    brand: "B&B Machinery",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8JxTK1i5vsArY9cZXo2aniWN9ajAOqRldvIUB9Y2I16K3roi5RqRSSGts&s=10",
    description:
      "Mechanical tools and equipment for workshops and technical work.",
    featured: true,
  },

  {
    id: "machinery",
    name: "Machinery Equipment",
    category: "Machinery",
    brand: "B&B Machinery",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSy12UuB4ZkltJ1qV7A0VDNGHP-tziJCgGZITSf2LBsRA&s=10",
    description:
      "Machinery and equipment for agricultural, construction and industrial applications.",
    featured: true,
  },
];

export const productCategories = [
  "Agricultural Machinery",
  "Machinery",
  "Power Tools",
  "Mechanical Tools",
  "Spare Parts",
  "Workshop Equipment",
];