import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

/** Questions the bot could not answer from the knowledge files. Review them and add answers to data/knowledge. */
export async function logUnanswered(question: string, lang: "en" | "ne", handoff: boolean) {
  try {
    const dir = path.resolve(/*turbopackIgnore: true*/ process.env.BOT_DATA_DIR || path.join(process.cwd(), "data", "bot"));
    await fs.mkdir(dir, { recursive: true });
    const line = JSON.stringify({ at: new Date().toISOString(), lang, handoff, q: question.slice(0, 300) });
    await fs.appendFile(path.join(dir, "unanswered.jsonl"), line + "\n", "utf8");
  } catch {
    /* logging must never break the chat */
  }
}
