import { integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, paisa } from "../../db/columns";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").unique(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    district: text("district"),
    panNo: text("pan_no"),
    type: text("type").notNull().default("RETAIL"),
    creditLimitPaisa: paisa("credit_limit_paisa").notNull().default(BigInt(0)),
    loyaltyPoints: integer("loyalty_points").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("customers_phone_uq").on(t.phone)],
);
