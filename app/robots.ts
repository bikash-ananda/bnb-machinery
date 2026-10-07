import type { MetadataRoute } from "next";

const base = process.env.APP_ORIGIN || "http://localhost:3000";
// The temporary *.vercel.app address is not indexed unless ALLOW_INDEXING=true.
const temporary = /\.vercel\.app/.test(base) && process.env.ALLOW_INDEXING !== "true";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: temporary
      ? { userAgent: "*", disallow: ["/"] }
      : { userAgent: "*", allow: "/", disallow: ["/admin", "/staff", "/api"] },
    sitemap: base + "/sitemap.xml",
  };
}