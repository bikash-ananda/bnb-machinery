import { describe, expect, it } from "vitest";
import { canStaffReplyToConversation, canTransitionConversationStatus, canTransitionQuoteStatus, QuoteRequestSchema } from "./validation";

describe("quotation request validation", () => {
  const valid = {
    customerName: "Bikash Rana",
    phone: "+977 9800000000",
    items: [{ productName: "Power tiller", quantity: 2 }],
  };

  it("accepts a customer request and applies safe defaults", () => {
    expect(QuoteRequestSchema.parse(valid)).toMatchObject({ customerType: "RETAIL", items: valid.items });
  });

  it("rejects invalid contact, excessive quantities and unknown fields", () => {
    expect(QuoteRequestSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
    expect(QuoteRequestSchema.safeParse({ ...valid, items: [{ productName: "Tool", quantity: 10000 }] }).success).toBe(false);
    expect(QuoteRequestSchema.safeParse({ ...valid, admin: true }).success).toBe(false);
  });

  it("limits item count and text lengths", () => {
    expect(QuoteRequestSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(QuoteRequestSchema.safeParse({ ...valid, notes: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("quotation request status workflow", () => {
  it("allows staff to advance or close a request", () => {
    expect(canTransitionQuoteStatus("NEW", "IN_PROGRESS")).toBe(true);
    expect(canTransitionQuoteStatus("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(canTransitionQuoteStatus("RESOLVED", "CLOSED")).toBe(true);
  });

  it("prevents reopening a closed request", () => {
    expect(canTransitionQuoteStatus("CLOSED", "IN_PROGRESS")).toBe(false);
  });
});

describe("support conversation status workflow", () => {
  it("allows human handoff and resolution", () => {
    expect(canTransitionConversationStatus("OPEN", "NEEDS_HUMAN")).toBe(true);
    expect(canTransitionConversationStatus("NEEDS_HUMAN", "RESOLVED")).toBe(true);
  });

  it("keeps closed conversations terminal", () => {
    expect(canTransitionConversationStatus("CLOSED", "OPEN")).toBe(false);
  });

  it("allows staff replies until a conversation is closed", () => {
    expect(canStaffReplyToConversation("NEEDS_HUMAN")).toBe(true);
    expect(canStaffReplyToConversation("RESOLVED")).toBe(true);
    expect(canStaffReplyToConversation("CLOSED")).toBe(false);
  });
});
