export const company = {
  name: "B & B Machinery",
  shortName: "B&B Machinery",

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
    tiktok:
      "https://www.tiktok.com/@bandbmachinerysuppliers?_r=1&_t=ZS-9ADz122d9y1",
  },

  serviceAreas: ["Kaski", "Baglung", "Mustang", "Syangja"],

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