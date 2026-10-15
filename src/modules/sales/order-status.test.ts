import { describe, expect, it } from "vitest";
import { canTransitionOrderStatus, orderStatusSources } from "./order-status";

describe("order status transitions", () => {
  it.each([
    ["NEW", "CONFIRMED"],
    ["NEW", "CANCELLED"],
    ["CONFIRMED", "DISPATCHED"],
    ["CONFIRMED", "READY_FOR_PICKUP"],
    ["CONFIRMED", "COMPLETED"],
    ["DISPATCHED", "COMPLETED"],
    ["READY_FOR_PICKUP", "COMPLETED"],
  ])("allows %s -> %s", (current, next) => {
    expect(canTransitionOrderStatus(current, next)).toBe(true);
  });

  it.each([
    ["NEW", "COMPLETED"],
    ["NEW", "DISPATCHED"],
    ["CONFIRMED", "CANCELLED"],
    ["CANCELLED", "CONFIRMED"],
    ["COMPLETED", "DISPATCHED"],
    ["UNKNOWN", "COMPLETED"],
    ["toString", "COMPLETED"],
  ])("rejects %s -> %s", (current, next) => {
    expect(canTransitionOrderStatus(current, next)).toBe(false);
  });

  it("returns the valid source states for a target status", () => {
    expect(orderStatusSources("COMPLETED")).toEqual(["CONFIRMED", "DISPATCHED", "READY_FOR_PICKUP"]);
    expect(orderStatusSources("NEW")).toEqual([]);
  });
});
