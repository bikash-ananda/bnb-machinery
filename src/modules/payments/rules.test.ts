import { describe, expect, it } from "vitest";
import {
  MAX_QR_BYTES, PaymentError, assertPayable, detectImageMime, normalizeTxnId, parseQrUpload, phonesMatch, rupeesToPaisa,
} from "./rules";

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 1)]);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 2)]);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(20)]);

describe("normalizeTxnId", () => {
  it("uppercases and strips spaces", () => expect(normalizeTxnId(" 0ab c12d ")).toBe("0ABC12D"));
  it("rejects short, long, odd or non-string input", () => {
    for (const v of ["abc", "x".repeat(41), "ab;cd", "", null, 12345678]) expect(normalizeTxnId(v)).toBeNull();
  });
  it("accepts separators", () => expect(normalizeTxnId("TXN-2026/11_14")).toBe("TXN-2026/11_14"));
});

describe("phonesMatch", () => {
  it("matches across formats", () => {
    expect(phonesMatch("9841234567", "+977-9841234567")).toBe(true);
    expect(phonesMatch("+9779841234567", "98412 34567")).toBe(true);
  });
  it("rejects different or too-short numbers", () => {
    expect(phonesMatch("9841234567", "9841234568")).toBe(false);
    expect(phonesMatch("123456", "123456")).toBe(false);
  });
});

describe("image detection and QR upload", () => {
  it("detects png, jpeg and webp from bytes", () => {
    expect(detectImageMime(png)).toBe("image/png");
    expect(detectImageMime(jpg)).toBe("image/jpeg");
    expect(detectImageMime(webp)).toBe("image/webp");
    expect(detectImageMime(Buffer.from("<svg></svg>"))).toBeNull();
  });
  it("accepts raw base64 and data URLs", () => {
    expect(parseQrUpload("image/png", png.toString("base64")).mime).toBe("image/png");
    expect(parseQrUpload(undefined, "data:image/jpeg;base64," + jpg.toString("base64")).mime).toBe("image/jpeg");
  });
  it("rejects a declared type that does not match the content", () => {
    expect(() => parseQrUpload("image/png", jpg.toString("base64"))).toThrow(PaymentError);
  });
  it("rejects svg/html disguised as an image, bad base64 and oversize files", () => {
    expect(() => parseQrUpload("image/png", Buffer.from("<svg onload=alert(1)>").toString("base64"))).toThrow(PaymentError);
    expect(() => parseQrUpload("image/png", "not base64!!")).toThrow(PaymentError);
    expect(() => parseQrUpload("image/png", Buffer.concat([png, Buffer.alloc(MAX_QR_BYTES)]).toString("base64"))).toThrow(PaymentError);
    expect(() => parseQrUpload("image/png", 42)).toThrow(PaymentError);
  });
});

describe("rupeesToPaisa", () => {
  it("converts valid amounts", () => {
    expect(rupeesToPaisa("1250")).toBe(125000n);
    expect(rupeesToPaisa("1250.5")).toBe(125050n);
    expect(rupeesToPaisa("0.05")).toBe(5n);
    expect(rupeesToPaisa(99)).toBe(9900n);
  });
  it("rejects negatives, 3 decimals, exponents and text", () => {
    for (const v of ["-5", "1.234", "1e5", "abc", "", "  ", null, "12,000"]) expect(() => rupeesToPaisa(v)).toThrow(PaymentError);
  });
});

describe("assertPayable", () => {
  it("allows a partial and an exact payment", () => {
    expect(() => assertPayable(500n, 1000n)).not.toThrow();
    expect(() => assertPayable(1000n, 1000n)).not.toThrow();
  });
  it("blocks over-payment, zero and already-paid orders", () => {
    expect(() => assertPayable(1001n, 1000n)).toThrow(/more than the balance/);
    expect(() => assertPayable(0n, 1000n)).toThrow(PaymentError);
    expect(() => assertPayable(100n, 0n)).toThrow(/already fully paid/);
  });
});
