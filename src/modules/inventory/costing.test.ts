import { describe, expect, it } from "vitest";
import { toPaisa } from "../../lib/money";
import { weightedAverage } from "./costing";

describe("weightedAverage", () => {
  it("uses the new price when there is no stock", () => {
    expect(weightedAverage(0, null, 5, toPaisa("200"))).toBe(toPaisa("200"));
  });
  it("blends old and new cost", () => {
    expect(weightedAverage(10, toPaisa("100"), 10, toPaisa("200"))).toBe(toPaisa("150"));
  });
  it("weights by quantity", () => {
    expect(weightedAverage(30, toPaisa("100"), 10, toPaisa("200"))).toBe(toPaisa("125"));
  });
});
