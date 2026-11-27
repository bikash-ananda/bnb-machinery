import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/seo/site-url";
import { getShopProducts } from "@/lib/server/catalog";

// The product list is database-backed. Generate the sitemap at request time
// rather than requiring a production PostgreSQL connection during CI builds.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [
    "/",
    "/about",
    "/products",
    "/brands",
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
