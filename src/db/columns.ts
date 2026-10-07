import { bigint, timestamp } from "drizzle-orm/pg-core";
/** Money is always integer paisa (bigint). Never floats. */
export const paisa = (name: string) => bigint(name, { mode: "bigint" });
export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
