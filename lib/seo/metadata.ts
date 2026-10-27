import type { Metadata } from "next";
import { absoluteSiteUrl } from "@/lib/seo/site-url";

const socialImage = "/images/IMG-20261004-WA0010.jpg";

export function pageSocialMetadata(
  title: string,
  description: string,
  path: string,
  image = socialImage,
): Pick<Metadata, "openGraph" | "twitter"> {
  const imageUrl = absoluteSiteUrl(image);
  const url = absoluteSiteUrl(path);

  return {
    openGraph: {
      type: "website",
      siteName: "Machinery Tools Nepal",
      locale: "en_NP",
      title,
      description,
      url,
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
