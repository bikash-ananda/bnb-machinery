import "server-only";

type PaymentProvider = "adbl" | "nabil" | "esewa";
type BitMatrix = { getWidth(): number; getHeight(): number; get(x: number, y: number): boolean | number };
type Writer = { encode(text: string, format: string, width: number, height: number, hints: Map<string, string>): BitMatrix };

// The small vendored ZXing writer keeps QR generation local and avoids sending payment details
// to a third-party image service. See qr-vendor/NOTICE.md for the upstream license.
const { default: QRCodeWriter } = require("./qr-vendor/cjs/core/qrcode/QRCodeWriter.js") as { default: new () => Writer };
const { default: BarcodeFormat } = require("./qr-vendor/cjs/core/BarcodeFormat.js") as { default: { QR_CODE: string } };

const payees: Record<PaymentProvider, Record<string, string>> = {
  adbl: {
    accountNumber: "0326801903620016",
    accountName: "B AND  B MACHINARY SUPPLIERS",
    bankCode: "ADBLNPKA",
    accountType: "Business Loan",
    bankCodeCIPS: "0301",
  },
  nabil: {
    accountNumber: "27010017501460",
    accountName: "BIKASH BHATTARAI",
    bankCode: "NARBNPKA",
    accountType: "NABIL GENERAL SAVING ACCOUNT",
    bankCodeCIPS: "0401",
  },
  esewa: {
    name: "Bikash Bhattarai",
    eSewa_id: "9856088600",
  },
};

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return value === "adbl" || value === "nabil" || value === "esewa";
}

export function paymentProviderName(provider: PaymentProvider) {
  return provider === "adbl" ? "ADBL Bank" : provider === "nabil" ? "Nabil Bank" : "eSewa";
}

/**
 * Build an amount-bearing QR from the supplied recipient identity and the server-priced order.
 * These source QRs are provider-specific JSON, so the amount/reference fields are appended to
 * their original payload. This encodes the exact total but is not a merchant payment callback.
 */
export function createPaymentQr(provider: PaymentProvider, amountNpr: number, orderNo: string) {
  if (!Number.isFinite(amountNpr) || amountNpr <= 0 || !Number.isSafeInteger(Math.round(amountNpr * 100))) {
    throw new Error("A valid, positive order amount is required to make a payment QR.");
  }
  const amount = Number(amountNpr.toFixed(2));
  const payload = JSON.stringify({
    ...payees[provider],
    amount: amount.toFixed(2),
    currency: "NPR",
    reference: orderNo,
    remarks: orderNo,
  });
  const matrix = new QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, 320, 320, new Map());
  const segments: string[] = [];
  for (let y = 0; y < matrix.getHeight(); y++) {
    let start = -1;
    for (let x = 0; x <= matrix.getWidth(); x++) {
      const black = x < matrix.getWidth() && Boolean(matrix.get(x, y));
      if (black && start < 0) start = x;
      if (!black && start >= 0) {
        const run = x - start;
        segments.push(`M${start} ${y}h${run}v1h-${run}z`);
        start = -1;
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="#fff"/><path d="${segments.join("")}" fill="#111827"/></svg>`;
  return { svg, provider, amount, payee: provider === "esewa" ? payees.esewa.name : payees[provider].accountName };
}
