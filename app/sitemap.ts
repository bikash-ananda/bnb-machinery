import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/seo/site-url";
import { getShopProducts } from "@/lib/server/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    "/",
    "/about",
    "/products",
    "/brands",
    "/brands/deli",
    "/services",
    "/gallery",
    "/get-a-quote",
    "/contact",
    "/location",
  ];
  const products = await getShopProducts();

  return [
    ...pages.map((path) => ({ url: absoluteSiteUrl(path) })),
    ...products.map((product) => ({
      url: absoluteSiteUrl(`/products/${encodeURIComponent(product.slug)}`),
      ...(product.image && { images: [absoluteSiteUrl(product.image)] }),
    })),
  ];
}
