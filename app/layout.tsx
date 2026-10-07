import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Noto_Sans_Devanagari,
} from "next/font/google";

import "./globals.css";
import Chatbot from "@/components/ai/Chatbot";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";

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
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || "http://localhost:3000"),
  openGraph: { type: "website", siteName: "B & B Machinery", locale: "en_NP", images: ["/images/IMG-20261004-WA0010.jpg"] },
  title: {
    default: "B & B Machinery | Machinery & Machinery Parts in Pokhara",
    template: "%s | B & B Machinery",
  },
  description:
    "B & B Machinery provides machinery, machinery parts, repair, maintenance, installation, spare parts and technical support in Pokhara and Western Nepal.",
  keywords: [
    "B & B Machinery",
    "machinery Pokhara",
    "machinery parts Pokhara",
    "machinery spare parts",
    "machinery repair",
    "machinery maintenance",
  ],
  authors: [{ name: "B & B Machinery" }],
  creator: "B & B Machinery",
  publisher: "B & B Machinery",
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
