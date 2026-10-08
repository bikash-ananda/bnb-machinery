import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildIndex, chunkMarkdown, isConfident, search, stem, tokenize } from "@/src/lib/bot/retrieval";
import { HANDOFF_TOKEN, knowledgeBlock, splitHandoff } from "@/src/lib/bot/reply";

const dir = join(process.cwd(), "data", "knowledge");
const chunks = readdirSync(dir).filter((f) => f.endsWith(".md")).flatMap((f) => chunkMarkdown(f, readFileSync(join(dir, f), "utf8")));
const index = buildIndex(chunks);
const top = (q: string) => search(index, q, 3);

describe("tokenize", () => {
  it("keeps Devanagari words whole (vowel signs are not split)", () => {
    expect(tokenize("पसल कहाँ छ")).toEqual(["पसल"]);
    expect(tokenize("स्पेयर पार्ट्स")).toEqual(["स्पेयर", "पार्ट्स"]);
  });
  it("stems simple endings", () => {
    expect(stem("tillers")).toBe("tiller");
    expect(stem("पसलमा")).toBe("पसल");
  });
});

describe("knowledge search (English and Nepali)", () => {
  const cases: [string, string][] = [
    ["where is your shop located", "Where is the shop"],
    ["तपाईंको पसल कहाँ छ", "Where is the shop"],
    ["can I pay by cash on delivery", "How can I pay"],
    ["भुक्तानी कसरी गर्ने", "How can I pay"],
    ["do you repair tillers", "repair"],
    ["मेसिन मर्मत गर्नुहुन्छ", "repair"],
    ["do you sell spare parts for my machine", "spare parts"],
    ["स्पेयर पार्ट्स पाइन्छ", "spare parts"],
    ["which areas do you deliver to", "deliver"],
    ["what is your phone number", "Location and contact"],
    ["फोन नम्बर के हो", "Location and contact"],
    ["how do I get a quotation", "price or quotation"],
  ];
  for (const [q, expected] of cases) {
    it(`"${q}" finds the right section`, () => {
      const hits = top(q);
      expect(isConfident(hits)).toBe(true);
      expect(hits.slice(0, 2).some((h) => h.chunk.title.toLowerCase().includes(expected.toLowerCase()))).toBe(true);
    });
  }
  it("is NOT confident about unrelated questions (so the bot hands off instead of guessing)", () => {
    expect(isConfident(top("what is the weather on mars today"))).toBe(false);
    expect(isConfident(top("blorp zzz quantum"))).toBe(false);
    expect(isConfident(top("what is the warranty period"))).toBe(false);
    expect(isConfident(top("मेरो अर्डर कहाँ पुग्यो"))).toBe(false);
  });
});

describe("hand-off marker", () => {
  it("strips the marker and reports it", () => {
    expect(splitHandoff(`Our team will help. ${HANDOFF_TOKEN}`)).toEqual({ text: "Our team will help.", handoff: true });
    expect(splitHandoff("Hello").handoff).toBe(false);
  });
  it("tells the model to hand off when nothing was found", () => {
    expect(knowledgeBlock([], false)).toContain(HANDOFF_TOKEN);
    expect(knowledgeBlock(top("how can I pay"), true)).toContain("COMPANY KNOWLEDGE");
  });
});