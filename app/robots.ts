import type { MetadataRoute } from "next";
import { absoluteSiteUrl, siteOrigin } from "@/lib/seo/site-url";

// The temporary *.vercel.app address is not indexed unless ALLOW_INDEXING=true.
const temporary = new URL(siteOrigin).hostname.endsWith(".vercel.app") && process.env.ALLOW_INDEXING !== "true";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: temporary
      ? { userAgent: "*", disallow: ["/"] }
      : {
          userAgent: "*",
          allow: ["/", "/api/inventory/images/"],
          disallow: ["/admin", "/staff", "/api"],
        },
    sitemap: absoluteSiteUrl("/sitemap.xml"),
  };
}
