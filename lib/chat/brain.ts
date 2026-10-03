import { company } from "@/data/company";
import { products, type Product } from "@/data/products";
import { services } from "@/data/services";
import { topics } from "@/lib/chat/knowledge";

export type Lang = "en" | "ne";
export type ChatLink = { label: string; href: string; external?: boolean };
export type Reply = { text: string; links?: ChatLink[]; chips?: string[] };
export type Flow = null | { step: "item" | "name" | "phone"; item?: string; name?: string };
export type Result = { reply: Reply; flow: Flow };

export const hasDevanagari = (s: string) => /[\u0900-\u097f]/.test(s);
const L = (lang: Lang, en: string, ne: string) => (lang === "ne" ? ne : en);
const wa = (text?: string) =>
  `https://wa.me/977${company.contact.whatsapp}` + (text ? `?text=${encodeURIComponent(text)}` : "");
const call: ChatLink = { label: "☎ Call now", href: `tel:${company.contact.phoneRaw}`, external: true };
const waLink = (text?: string, label = "💬 WhatsApp us"): ChatLink => ({ label, href: wa(text), external: true });

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/g, " ").replace(/\s+/g, " ").trim();

/** Whole-word match for short words, prefix match for longer ones (so "hi" never matches "machinery"). */
function has(t: string, words: string[]) {
  return words.some((w) =>
    new RegExp(w.length <= 3 ? `(^|\\s)${w}(\\s|$)` : `(^|\\s)${w}`).test(t),
  );
}

const generic = ["machinery", "equipment", "tools"];

export function findProducts(t: string): Product[] {
  const scored = products.map((p) => {
    let score = 0;
    const topic = topics.find((x) => x.product === p.id);
    if (topic && has(t, topic.words)) score += 3;
    for (const w of norm(p.name).split(" ")) if (w.length > 3 && !generic.includes(w) && t.includes(w)) score += 2;
    return { p, score };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.p);
}

function bestTopic(t: string) {
  let best: (typeof topics)[number] | undefined;
  let bestScore = 0;
  for (const tp of topics) {
    const score = tp.words.filter((w) => has(t, [w])).length;
    if (score > bestScore) { best = tp; bestScore = score; }
  }
  return best;
}

const defaultChips = (lang: Lang) =>
  lang === "ne"
    ? ["कृषि मेसिन", "पावर टिलर", "मूल्य/कोटेसन", "स्पेयर पार्ट्स", "हाम्रो बारे", "ठेगाना"]
    : ["Agriculture machines", "Power tiller", "Get a quote", "Spare parts", "About B & B", "Location"];

const topicChips = (lang: Lang) =>
  lang === "ne"
    ? ["मूल्य/कोटेसन", "कसरी छान्ने", "मर्मत सम्भार", "सुरक्षा", "सम्पर्क"]
    : ["Get a quote", "How to choose", "Maintenance tips", "Safety tips", "Contact"];

/** Text for text-to-speech: no emoji or symbols. */
export const speakable = (r: Reply) =>
  r.text.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F\u2192]/gu, " ").replace(/\s+/g, " ").trim();

export function greeting(lang: Lang): Reply {
  return {
    text: L(lang,
      "Namaste! 👋 I'm the B & B Machinery assistant. Ask me about agricultural machines (power tiller, reaper, corn sheller), tools, spare parts, prices or our shop — by typing or by voice. 🎤",
      "नमस्ते! 👋 म B & B Machinery को सहायक हुँ। कृषि मेसिन (पावर टिलर, रिपर, कर्न सेलर), टुल, स्पेयर पार्ट्स, मूल्य वा हाम्रो पसलबारे लेखेर वा बोलेर सोध्नुहोस्। 🎤"),
    chips: defaultChips(lang),
  };
}

function finishQuote(lang: Lang, item: string, name: string, phone: string): Result {
  const msg = `Hello B & B Machinery,\nName: ${name}\nPhone: ${phone}\nLooking for: ${item}`;
  return {
    flow: null,
    reply: {
      text: L(lang,
        `Thanks ${name}! Tap below to send your request for “${item}” on WhatsApp — our team will reply with price and availability.`,
        `धन्यवाद ${name}! “${item}” को अनुरोध WhatsApp मा पठाउन तल थिच्नुहोस् — हाम्रो टोलीले मूल्य र उपलब्धता बताउनेछ।`),
      links: [waLink(msg, L(lang, "✅ Send on WhatsApp", "✅ WhatsApp मा पठाउनुहोस्")), call],
      chips: defaultChips(lang),
    },
  };
}

function handleFlow(t: string, raw: string, flow: NonNullable<Flow>, lang: Lang): Result {
  if (has(t, ["cancel", "stop", "exit", "रद्द"])) {
    return { flow: null, reply: { text: L(lang, "No problem — request cancelled.", "ठीक छ — अनुरोध रद्द गरियो।"), chips: defaultChips(lang) } };
  }
  if (flow.step === "item") {
    return { flow: { step: "name", item: raw.slice(0, 120) },
      reply: { text: L(lang, "Got it. What's your name?", "बुझियो। तपाईंको नाम के हो?") } };
  }
  if (flow.step === "name") {
    return { flow: { ...flow, step: "phone", name: raw.slice(0, 60) },
      reply: { text: L(lang, "And your phone / WhatsApp number?", "तपाईंको फोन / WhatsApp नम्बर?") } };
  }
  const ascii = raw.replace(/[\u0966-\u096f]/g, (d) => String(d.charCodeAt(0) - 0x0966));
  const digits = ascii.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return { flow, reply: { text: L(lang, "That number doesn't look right. Please say or type a valid phone number (or say “cancel”).", "नम्बर मिलेन। सही फोन नम्बर भन्नुहोस् वा लेख्नुहोस् (वा “cancel” भन्नुहोस्)।") } };
  }
  return finishQuote(lang, flow.item ?? "", flow.name ?? "", ascii.trim());
}

export function respond(raw: string, flow: Flow, lang: Lang): Result {
  const t = norm(raw);
  if (flow) return handleFlow(t, raw, flow, lang);
  const found = findProducts(t);
  const words = t.split(" ").length;

  if (has(t, ["thanks", "thank", "thankyou", "dhanyabad", "धन्यवाद"]))
    return { flow: null, reply: { text: L(lang, "You're welcome! 😊 Anything else?", "स्वागत छ! 😊 अरु केही चाहिन्छ?"), chips: defaultChips(lang) } };

  if (words <= 4 && has(t, ["hello", "hi", "hey", "namaste", "namaskar", "नमस्ते", "नमस्कार"]))
    return { flow: null, reply: greeting(lang) };

  if (has(t, ["human", "person", "agent", "owner", "manager", "staff", "talk", "बोल्न"]))
    return { flow: null, reply: { text: L(lang, "Sure — our team is happy to talk directly.", "हुन्छ — हाम्रो टोलीसँग सिधै कुरा गर्न सक्नुहुन्छ।"), links: [waLink(), call] } };

  if (has(t, ["price", "cost", "rate", "quote", "quotation", "kati", "bhau", "कति", "मूल्य", "भाउ", "कोटेसन"])) {
    const item = found[0]?.name;
    return item
      ? { flow: { step: "name", item },
          reply: { text: L(lang, `Prices for the ${item} depend on model and current stock, so we quote directly. What's your name?`, `${item} को मूल्य मोडल र स्टकअनुसार फरक हुन्छ। तपाईंको नाम के हो?`) } }
      : { flow: { step: "item" },
          reply: { text: L(lang, "Prices depend on model and stock, so we quote directly. Which machine or part do you need?", "मूल्य मोडल र स्टकअनुसार फरक हुन्छ। कुन मेसिन वा पार्ट चाहिएको हो?") } };
  }

  if (has(t, ["where", "location", "address", "map", "direction", "directions", "buspark", "kaha", "kahaa", "कहाँ", "ठेगाना"]))
    return { flow: null, reply: {
      text: L(lang, `We're at ${company.location.address}, ${company.location.district}, Nepal.`, `हामी ${company.location.address}, कास्कीमा छौँ।`),
      links: [{ label: "📍 Map & directions", href: "/location" }, call], chips: defaultChips(lang) } };

  if (has(t, ["open", "hours", "closing", "timing", "खुल्ने", "समय"]))
    return { flow: null, reply: { text: L(lang, "I can't confirm opening hours here — please call us and we'll tell you if we're open.", "खुल्ने समय यहाँ पुष्टि गर्न सक्दिन — कृपया फोन गरेर सोध्नुहोस्।"), links: [call, waLink()] } };

  if (has(t, ["contact", "phone", "call", "number", "whatsapp", "viber", "email", "सम्पर्क", "फोन"]))
    return { flow: null, reply: {
      text: L(lang, `Call, WhatsApp or Viber: ${company.contact.phone}\nEmail: ${company.contact.email}`, `फोन / WhatsApp / Viber: ${company.contact.phone}\nइमेल: ${company.contact.email}`),
      links: [call, waLink()] } };

  if (has(t, ["deliver", "delivery", "ship", "transport", "courier"]))
    return { flow: null, reply: { text: L(lang, `We serve ${company.serviceAreas.join(", ")}. Please confirm delivery for your location with our team.`, `हामी ${company.serviceAreas.join(", ")} मा सेवा दिन्छौँ। डेलिभरीका लागि टोलीसँग पुष्टि गर्नुहोस्।`), links: [waLink("Hello, do you deliver to my area?"), call] } };

  if (has(t, ["part", "parts", "spare", "spares", "replacement", "पार्ट", "स्पेयर"]))
    return { flow: { step: "item" }, reply: {
      text: L(lang, "We supply spare parts. Tell me the machine brand, model and the part you need (you can also send a photo on WhatsApp).", "हामी स्पेयर पार्ट्स उपलब्ध गराउँछौँ। मेसिनको ब्रान्ड, मोडल र चाहिएको पार्ट भन्नुहोस् वा लेख्नुहोस् (WhatsApp मा फोटो पनि पठाउन सक्नुहुन्छ)।"),
      links: [waLink("Hello, I need a spare part. Photo attached.", "📷 Send photo on WhatsApp")] } };

  const topic = bestTopic(t);
  if (topic) {
    const prod = products.find((p) => p.id === topic.product);
    return { flow: null, reply: {
      text: L(lang, topic.en, topic.ne),
      links: [
        ...(prod ? [{ label: L(lang, `Quote: ${prod.name} →`, `कोटेसन: ${prod.name} →`), href: `/contact?item=${encodeURIComponent(prod.name)}` }] : []),
        waLink(`Hello, I have a question about: ${raw.slice(0, 120)}`, L(lang, "💬 Ask our team", "💬 टोलीलाई सोध्नुहोस्")),
        { label: L(lang, "Browse products", "उत्पादनहरू हेर्नुहोस्"), href: "/products" },
      ],
      chips: topicChips(lang) } };
  }

  if (has(t, ["service", "services", "repair", "install", "installation", "सेवा", "मर्मत"]))
    return { flow: null, reply: {
      text: L(lang, `Our services: ${services.map((s) => s.title).join(", ")}.`, `हाम्रा सेवाहरू: ${services.map((s) => s.title).join(", ")}।`),
      links: [{ label: L(lang, "See all services", "सबै सेवाहरू"), href: "/services" }, waLink("Hello, I need a service.")], chips: topicChips(lang) } };

  if (has(t, ["product", "products", "catalog", "catalogue", "machinery", "machine", "machines", "equipment", "find", "मेसिन", "सामान"]))
    return { flow: null, reply: {
      text: L(lang, "We supply agricultural machinery (tillers, reapers, corn shellers), power tools, mechanical tools, workshop equipment and spare parts. Which one are you looking for?", "हामी कृषि मेसिन (टिलर, रिपर, मकै सेलर), पावर टुल, मेकानिकल टुल, वर्कशप उपकरण र स्पेयर पार्ट्स उपलब्ध गराउँछौँ। कुन चाहिन्छ?"),
      links: [{ label: L(lang, "Browse products", "उत्पादनहरू हेर्नुहोस्"), href: "/products" }],
      chips: lang === "ne" ? ["पावर टिलर", "रिपर", "मकै सेलर", "चेनसो"] : ["Power tiller", "Reaper", "Corn sheller", "Chainsaw"] } };

  return { flow: null, reply: {
    text: L(lang, "I'm not sure I understood — but our team can answer this quickly.", "मैले ठीक बुझिनँ — तर हाम्रो टोलीले छिटो जवाफ दिन सक्छ।"),
    links: [waLink(raw.slice(0, 200), L(lang, "💬 Ask our team", "💬 टोलीलाई सोध्नुहोस्")), call], chips: defaultChips(lang) } };
}