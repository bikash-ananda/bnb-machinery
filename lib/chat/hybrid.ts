import type { Flow } from "@/lib/chat/brain";

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/g, " ").replace(/\s+/g, " ").trim();
const has = (t: string, words: string[]) =>
  words.some((w) => new RegExp(w.length <= 3 ? `(^|\\s)${w}(\\s|$)` : `(^|\\s)${w}`).test(t));

// Fixed business facts and the quote / spare-part flows stay local (instant, free, always accurate).
const LOCAL = [
  "thanks", "thank", "thankyou", "dhanyabad", "धन्यवाद",
  "hello", "hi", "hey", "namaste", "namaskar", "नमस्ते", "नमस्कार",
  "human", "person", "agent", "owner", "manager", "staff", "talk", "बोल्न",
  "price", "cost", "rate", "quote", "quotation", "kati", "bhau", "कति", "मूल्य", "भाउ", "कोटेसन",
  "where", "location", "address", "map", "direction", "directions", "buspark", "kaha", "kahaa", "कहाँ", "ठेगाना",
  "open", "hours", "closing", "timing", "खुल्ने", "समय",
  "contact", "phone", "call", "number", "whatsapp", "viber", "email", "सम्पर्क", "फोन",
  "deliver", "delivery", "ship", "transport", "courier",
  "part", "parts", "spare", "spares", "replacement", "पार्ट", "स्पेयर",
];

/** True when the question should go to OpenAI (open questions, advice, troubleshooting). */
export function needsAI(raw: string, flow: Flow) {
  if (flow) return false;
  return !has(norm(raw), LOCAL);
}