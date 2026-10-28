// EDIT THIS FILE to change the notice bar (top of every page) and the floating offer card (home page).
// enabled: false hides one. startsAt / endsAt (optional) switch it on and off by date, e.g. "2026-10-20T00:00:00+05:45".
export type Notice = {
  id: string;
  kind: "notice" | "offer";
  enabled: boolean;
  startsAt?: string;
  endsAt?: string;
  title: { en: string; ne: string };
  text: { en: string; ne: string };
  link?: { href: string; label: { en: string; ne: string } };
};

export const notices: Notice[] = [
  {
    id: "quote",
    kind: "notice",
    enabled: true,
    title: { en: "Need a price?", ne: "मूल्य चाहियो?" },
    text: { en: "Request a quotation for any machine, tool or spare part.", ne: "कुनै पनि मेसिन, औजार वा स्पेयर पार्टको कोटेसन माग्नुहोस्।" },
    link: { href: "/contact", label: { en: "Request quotation →", ne: "कोटेसन माग्नुहोस् →" } },
  },
  {
    id: "order",
    kind: "notice",
    enabled: true,
    title: { en: "Order by phone or WhatsApp", ne: "फोन वा WhatsApp बाट अर्डर" },
    text: { en: "+977 9856088600", ne: "+977 9856088600" },
    link: { href: "tel:+9779856088600", label: { en: "Call now →", ne: "अहिले फोन गर्नुहोस् →" } },
  },
  {
    id: "showroom",
    kind: "offer",
    enabled: true,
    title: {
      en: "🎉 Happy Tihar & Deepawali!",
      ne: "शुभ तिहार तथा दीपावली!",
    },
    text: {
      en: "May this Tihar and Deepawali bring happiness, prosperity, good health and success to you and your family. Visit our showroom at Baglung Buspark, Pokhara.",
      ne: "यो तिहार तथा दीपावलीले तपाईं र तपाईंको परिवारमा सुख, समृद्धि, सुस्वास्थ्य र सफलता ल्याओस्। बाग्लुङ बसपार्क, पोखरास्थित हाम्रो शोरुममा आउनुहोस्।",
    },
    link: {
      href: "/location",
      label: {
        en: "Visit our showroom →",
        ne: "हाम्रो शोरुममा आउनुहोस् →",
      },
    },
  },
];
