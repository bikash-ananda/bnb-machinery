// Confirmed B & B Machinery business profile.
// Keep unverified social links empty until the owner supplies the official URLs.
export const company = {
  name: "B & B Machinery",
  shortName: "B & B Machinery",
  legalName: "B And B Machinery Suppliers",

  location: {
    address: "Baglung Buspark, Pokhara",
    city: "Pokhara",
    district: "Kaski",
    province: "Gandaki Province",
    country: "Nepal",
  },

  contact: {
    phone: "+977 9856088600",
    phoneRaw: "+9779856088600",
    whatsapp: "9856088600",
    viber: "9856088600",
    email: "bnbmachinery@gmail.com",
  },

  social: {
    facebook: "",
    tiktok: "",
  },

  serviceAreas: ["Kaski", "Baglung", "Mustang", "Syangja"],
  serviceAreasNe: ["कास्की", "बाग्लुङ", "मुस्ताङ", "स्याङ्जा"],

  languages: ["English", "नेपाली"],

  navigation: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Products", href: "/products" },
    { label: "Brands", href: "/brands" },
    { label: "Services", href: "/services" },
    { label: "Gallery", href: "/gallery" },
    { label: "Contact", href: "/contact" },
    { label: "Location", href: "/location" },
  ],
} as const;
