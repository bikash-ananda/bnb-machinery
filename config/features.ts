// Feature flags. Turn modules on/off here without touching feature code.
export const features = {
  shop: true,
  compare: true,
  aiChat: true,
  voice: true,
  onlinePayments: false, // eSewa / Khalti (Roadmap 6.1)
  whatsappBot: false, // Roadmap 5.4
  cbms: false, // IRD CBMS adapter: owner confirmed e-billing NOT mandatory (see docs/PROJECT-FACTS.md)
} as const;

export type FeatureKey = keyof typeof features;
