/** Money is ALWAYS integer paisa (bigint). 1 rupee = 100 paisa. Never use floats for money. */
export type Paisa = bigint;

const DEC = /^-?\d+(\.\d{1,2})?$/;

/** "1234.5" | 1234.5 -> 123450n. Rejects more than 2 decimals and non-numbers. */
export function toPaisa(rupees: string | number): Paisa {
  const s = typeof rupees === "number" ? rupees.toFixed(2) : rupees.trim();
  if (!DEC.test(s)) throw new Error(`Invalid money value: ${String(rupees)}`);
  const neg = s.startsWith("-");
  const [whole, frac = ""] = s.replace("-", "").split(".");
  const p = BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0"));
  return neg ? -p : p;
}

/** For display/JSON only (loses exactness above ~9 quadrillion). */
export const fromPaisa = (p: Paisa) => Number(p) / 100;

const abs = (n: bigint) => (n < 0n ? -n : n);

/** Integer division rounding half away from zero. */
function divRound(num: bigint, den: bigint): bigint {
  const sign = num < 0n !== den < 0n ? -1n : 1n;
  const n = abs(num);
  const d = abs(den);
  return sign * ((n * 2n + d) / (d * 2n));
}

/** amount * rateBp / 10000, rounded half-up at 2 decimals (rate in basis points: 1300 = 13%). */
export const mulBp = (amount: Paisa, rateBp: number): Paisa => divRound(amount * BigInt(rateBp), 10000n);

/** quantity (up to 3 decimals) * unit price -> paisa, half-up. */
export function lineTotal(qty: number | string, unitPrice: Paisa): Paisa {
  const q = typeof qty === "number" ? qty.toFixed(3) : qty;
  if (!/^\d+(\.\d{1,3})?$/.test(q)) throw new Error(`Invalid quantity: ${String(qty)}`);
  const [w, f = ""] = q.split(".");
  const milli = BigInt(w) * 1000n + BigInt(f.padEnd(3, "0"));
  return divRound(unitPrice * milli, 1000n);
}

/** Tax-inclusive price -> net + tax. tax = gross - net so the parts always add up. */
export function splitInclusive(gross: Paisa, rateBp: number): { net: Paisa; tax: Paisa } {
  const net = divRound(gross * 10000n, 10000n + BigInt(rateBp));
  return { net, tax: gross - net };
}

export const sumPaisa = (values: Paisa[]): Paisa => values.reduce((a, b) => a + b, 0n);

/** Indian/Nepali digit grouping: 10170000n -> "Rs 1,01,700.00". */
export function formatNPR(p: Paisa, opts: { symbol?: boolean } = {}): string {
  const symbol = opts.symbol ?? true;
  const neg = p < 0n;
  const a = abs(p);
  const rupees = (a / 100n).toString();
  const paisa = (a % 100n).toString().padStart(2, "0");
  const last3 = rupees.slice(-3);
  const rest = rupees.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return `${neg ? "-" : ""}${symbol ? "Rs " : ""}${grouped}.${paisa}`;
}
