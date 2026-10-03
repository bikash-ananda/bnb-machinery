import type { MetadataRoute } from "next";
const base = process.env.APP_ORIGIN || "http://localhost:3000";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/products", "/brands", "/services", "/gallery", "/contact", "/location"].map((p) => ({ url: base + p, lastModified: new Date() }));
}
