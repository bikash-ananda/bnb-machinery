import { z } from "zod";

const phoneSchema = z.string().trim().min(7).max(32).refine((value) => {
  const normalized = value.replace(/[\s().-]/g, "");
  return /^\+?\d{7,15}$/.test(normalized);
}, "Enter a valid phone number.");

export const QuoteRequestSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  customerType: z.enum(["RETAIL", "WHOLESALE", "DEALER", "BUSINESS", "OTHER"]).default("RETAIL"),
  deliveryDistrict: z.string().trim().max(100).optional().default(""),
  deliveryAddress: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  items: z.array(z.object({
    productId: z.string().uuid().optional(),
    productName: z.string().trim().min(1).max(180),
    quantity: z.number().finite().positive().max(9999),
  }).strict()).min(1).max(20),
  requestId: z.string().uuid().optional(),
}).strict();

export type QuoteRequestInput = z.infer<typeof QuoteRequestSchema>;

export const QuoteStatusSchema = z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>;

export function canTransitionQuoteStatus(from: QuoteStatus, to: QuoteStatus) {
  if (from === to) return true;
  const next: Record<QuoteStatus, readonly QuoteStatus[]> = {
    NEW: ["IN_PROGRESS", "CLOSED"],
    IN_PROGRESS: ["RESOLVED", "CLOSED"],
    RESOLVED: ["IN_PROGRESS", "CLOSED"],
    CLOSED: [],
  };
  return next[from].includes(to);
}

export const SupportConversationStatusSchema = z.enum(["OPEN", "NEEDS_HUMAN", "RESOLVED", "CLOSED"]);
export type SupportConversationStatus = z.infer<typeof SupportConversationStatusSchema>;

export function canTransitionConversationStatus(from: SupportConversationStatus, to: SupportConversationStatus) {
  if (from === to) return true;
  const next: Record<SupportConversationStatus, readonly SupportConversationStatus[]> = {
    OPEN: ["NEEDS_HUMAN", "RESOLVED", "CLOSED"],
    NEEDS_HUMAN: ["OPEN", "RESOLVED", "CLOSED"],
    RESOLVED: ["OPEN", "CLOSED"],
    CLOSED: [],
  };
  return next[from].includes(to);
}

export function canStaffReplyToConversation(status: SupportConversationStatus) {
  return status !== "CLOSED";
}
