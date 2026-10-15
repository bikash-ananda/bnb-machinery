import type { Tx } from "../../db/client";
import { automationEvents } from "./schema";

export type AutomationEventInput = {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload?: Record<string, unknown>;
  dedupeKey: string;
  availableAt?: Date;
};

/** Write the event beside its business change so a committed order/stock change cannot lose its automation. */
export async function enqueueAutomationEvent(tx: Tx, event: AutomationEventInput) {
  const inserted = await tx.insert(automationEvents).values({
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload ?? {},
    dedupeKey: event.dedupeKey,
    availableAt: event.availableAt,
  }).onConflictDoNothing({ target: automationEvents.dedupeKey }).returning({ id: automationEvents.id });
  return inserted.length > 0;
}
