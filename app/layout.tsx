import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Noto_Sans_Devanagari,
} from "next/font/google";

import "./globals.css";
import Chatbot from "@/components/ai/Chatbot";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { pageSocialMetadata } from "@/lib/seo/metadata";
import { siteOrigin } from "@/lib/seo/site-url";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nepaliFont = Noto_Sans_Devanagari({
  variable: "--font-nepali",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  ...pageSocialMetadata(
    "Machinery Tools Nepal | Machinery, Tools & Spare Parts in Pokhara",
    "Shop machinery, agricultural equipment, power tools and spare parts in Pokhara. Browse online or ask about current stock, service and wholesale pricing.",
    "/",
  ),
  title: {
    default: "Machinery Tools Nepal",
    template: "%s | Machinery Tools Nepal",
  },
  description:
    "Machinery Tools Nepal supplies machinery, agricultural equipment, power tools and spare parts in Pokhara. Browse online and ask about repair, maintenance and wholesale support.",
  authors: [{ name: "Machinery Tools Nepal" }],
  creator: "Machinery Tools Nepal",
  publisher: "Machinery Tools Nepal",
  robots: {
    index: true,
    follow: true,
  },
};

const languageScript = `
(function () {
  try {
    var savedLanguage = localStorage.getItem("bnb-language");

    if (savedLanguage === "ne") {
      document.documentElement.dataset.language = "ne";
      document.documentElement.lang = "ne";
    } else {
      document.documentElement.dataset.language = "en";
      document.documentElement.lang = "en";
    }
  } catch (error) {
    document.documentElement.dataset.language = "en";
    document.documentElement.lang = "en";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-language="en"
      className={`${geistSans.variable} ${geistMono.variable} ${nepaliFont.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: languageScript }} />
      </head>

      <body>
        <LanguageProvider>
          {children}
          <Chatbot />
        </LanguageProvider>
      </body>
    </html>
  );
}
