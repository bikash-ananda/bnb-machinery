/** Moving weighted-average unit cost after receiving `qty` at `unit` on top of `onHand` at `oldCost`. All integer math, half-up. */
export function weightedAverage(onHand: number, oldCost: bigint | null, qty: number, unit: bigint): bigint {
  const oldMilli = BigInt(Math.max(0, Math.round(onHand * 1000)));
  const newMilli = BigInt(Math.round(qty * 1000));
  if (oldCost === null || oldMilli === 0n) return unit;
  const total = oldMilli + newMilli;
  const value = oldCost * oldMilli + unit * newMilli;
  return (value * 2n + total) / (total * 2n);
}
