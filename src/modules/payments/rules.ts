// Pure helpers (no database): validation and money rules for manual payments. Unit-tested in rules.test.ts.

export class PaymentError extends Error {}

export const PAYMENT_METHODS = ["QR", "BANK", "ESEWA", "KHALTI"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const isPaymentMethod = (v: unknown): v is PaymentMethod =>
  typeof v === "string" && (PAYMENT_METHODS as readonly string[]).includes(v);

export const QR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type QrMime = (typeof QR_MIME_TYPES)[number];
export const MAX_QR_BYTES = 300 * 1024;
export const MAX_PENDING_PER_ORDER = 3;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Transaction references are compared case-insensitively and without spaces, so the duplicate check cannot be dodged by retyping. */
export function normalizeTxnId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z0-9][A-Z0-9\-_/]{3,39}$/.test(t) ? t : null;
}

/** Compares the trailing digits so "98XXXXXXXX", "+97798XXXXXXXX" and "977-98XXXXXXXX" all match. */
export function phonesMatch(a: string, b: string): boolean {
  const da = a.replace(/\D/g, "");
  const db = b.replace(/\D/g, "");
  const n = Math.min(10, da.length, db.length);
  return n >= 7 && da.slice(-n) === db.slice(-n);
}

/** Identifies the real image type from its first bytes; the declared type is never trusted. */
export function detectImageMime(b: Uint8Array): QrMime | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

/** Accepts raw base64 or a data: URL. Returns the clean base64 and the detected mime type, or throws PaymentError. */
export function parseQrUpload(mime: unknown, data: unknown): { mime: QrMime; base64: string } {
  if (typeof data !== "string") throw new PaymentError("Upload a QR image.");
  let b64 = data.trim();
  let declared = typeof mime === "string" ? mime.toLowerCase() : "";
  const prefix = /^data:([\w/+.-]+);base64,/i.exec(b64);
  if (prefix) {
    if (!declared) declared = prefix[1].toLowerCase();
    b64 = b64.slice(prefix[0].length);
  }
  b64 = b64.replace(/\s+/g, "");
  if (!b64 || b64.length > Math.ceil((MAX_QR_BYTES * 4) / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new PaymentError("The QR image is invalid or larger than 300 KB.");
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length === 0 || bytes.length > MAX_QR_BYTES) throw new PaymentError("The QR image must be 300 KB or smaller.");
  const detected = detectImageMime(bytes);
  if (!detected) throw new PaymentError("The QR image must be PNG, JPEG or WebP.");
  if (declared && declared !== detected && !(declared === "image/jpg" && detected === "image/jpeg")) throw new PaymentError("The file type does not match its content.");
  return { mime: detected, base64: bytes.toString("base64") };
}

/** "1250", "1250.5" or "1250.50" -> paisa. Anything else (negative, 3 decimals, exponent, text) is rejected. */
export function rupeesToPaisa(v: unknown): bigint {
  const s = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim() : "";
  const m = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) throw new PaymentError("Enter a valid amount, for example 1250.50.");
  return BigInt(m[1]) * 100n + BigInt((m[2] ?? "").padEnd(2, "0") || "0");
}

/** Throws unless 0 < received <= due. */
export function assertPayable(received: bigint, due: bigint) {
  if (due <= 0n) throw new PaymentError("This order is already fully paid.");
  if (received <= 0n) throw new PaymentError("The received amount must be more than zero.");
  if (received > due) throw new PaymentError("The received amount is more than the balance due.");
}
