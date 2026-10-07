import type { ReactNode } from "react";

/**
 * Bilingual text that works in server components with no JavaScript.
 * Usage: <L en="Our services" ne="हाम्रा सेवाहरू" />
 * (Uses the site's .lang-en / .lang-ne CSS switch, so it follows the language button instantly.)
 */
export default function L({ en, ne }: { en: ReactNode; ne: ReactNode }) {
  return (
    <>
      <span className="lang-en">{en}</span>
      <span className="lang-ne">{ne}</span>
    </>
  );
}