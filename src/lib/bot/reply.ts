import type { Hit } from "@/src/lib/bot/retrieval";

export const HANDOFF_TOKEN = "[[HANDOFF]]";

/** Removes the hand-off marker from the model's text and reports whether it was present. */
export function splitHandoff(text: string): { text: string; handoff: boolean } {
  const handoff = text.includes(HANDOFF_TOKEN);
  return { text: text.split(HANDOFF_TOKEN).join("").trim(), handoff };
}

/** The block added to the AI instructions: the ONLY facts the bot may state. */
export function knowledgeBlock(hits: Hit[], confident: boolean): string {
  if (hits.length === 0 || !confident) {
    return `\n\nCOMPANY KNOWLEDGE: (nothing relevant was found for this question)\nIf the customer asks for company-specific facts (price, stock, hours, delivery, warranty, order status, policies), do not guess: say our team will help and end your reply with ${HANDOFF_TOKEN}. General machinery advice, troubleshooting and safety tips are still fine.`;
  }
  const body = hits.map((h, i) => `[${i + 1}] ${h.chunk.text}`).join("\n\n");
  return `\n\nCOMPANY KNOWLEDGE (the ONLY source of company facts; answer from it and never contradict it):\n${body}\n\nIf the knowledge above does not answer the customer's company-specific question, say our team will help and end your reply with ${HANDOFF_TOKEN}.`;
}