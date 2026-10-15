export const ORDER_STATUS_TRANSITIONS = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["DISPATCHED", "READY_FOR_PICKUP", "COMPLETED"],
  DISPATCHED: ["COMPLETED"],
  READY_FOR_PICKUP: ["COMPLETED"],
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS_TRANSITIONS | "COMPLETED" | "CANCELLED";

export function canTransitionOrderStatus(current: string, next: string): boolean {
  if (!Object.hasOwn(ORDER_STATUS_TRANSITIONS, current)) return false;
  const allowed = (ORDER_STATUS_TRANSITIONS as Record<string, readonly string[]>)[current];
  return allowed?.includes(next) ?? false;
}

export function orderStatusSources(next: string): (keyof typeof ORDER_STATUS_TRANSITIONS)[] {
  return (Object.entries(ORDER_STATUS_TRANSITIONS) as [keyof typeof ORDER_STATUS_TRANSITIONS, readonly string[]][])
    .filter(([, allowed]) => allowed.includes(next))
    .map(([current]) => current);
}
