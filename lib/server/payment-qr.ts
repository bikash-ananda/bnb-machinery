import "server-only";

type PaymentProvider = "adbl" | "nabil" | "esewa";

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return value === "adbl" || value === "nabil" || value === "esewa";
}

export function paymentProviderName(provider: PaymentProvider) {
  return provider === "adbl" ? "ADBL Bank" : provider === "nabil" ? "Nabil Bank" : "eSewa";
}
