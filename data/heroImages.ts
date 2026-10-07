import { generated } from "@/data/heroImages.generated";
import { siteImages } from "@/data/siteImages";

export type HeroSlide = { src: string; alt: string };

/** Your own photos for this page if any exist, otherwise the single fallback image from siteImages. */
export function heroSlides(key: string): HeroSlide[] {
  const own = (generated as Record<string, HeroSlide[]>)[key] ?? [];
  if (own.length) return own;
  const fb = (siteImages.hero as Record<string, HeroSlide | undefined>)[key === "home" ? "products" : key];
  return fb ? [fb] : [];
}