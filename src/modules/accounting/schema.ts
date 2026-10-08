import { sql } from "drizzle-orm";
import { boolean, check, date, index, pgTable, text, uniqueIndex, uuid, bigserial } from "drizzle-orm/pg-core";
import { createdAt, paisa } from "../../db/columns";
import { customers } from "../customers/schema";
import { suppliers } from "../purchasing/schema";

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameNe: text("name_ne"),
  type: text("type").notNull(), // ASSET | LIABILITY | EQUITY | INCOME | EXPENSE
  groupName: text("group_name").notNull(),
  isSystem: boolean("is_system").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
});

export const fiscalYears = pgTable("fiscal_years", {
  label: text("label").primaryKey(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  status: text("status").notNull().default("OPEN"), // OPEN | CLOSED (closed years reject new entries)
});

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryNo: text("entry_no").notNull().unique(),
    fiscalYear: text("fiscal_year").notNull(),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    bsDate: text("bs_date").notNull(),
    narration: text("narration").notNull(),
    sourceType: text("source_type"),
    sourceId: text("source_id"),
    reversalOf: uuid("reversal_of"),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("journal_source_uq").on(t.sourceType, t.sourceId), index("journal_fy_idx").on(t.fiscalYear, t.entryDate)],
);

export const journalLines = pgTable(
  "journal_lines",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    entryId: uuid("entry_id").notNull().references(() => journalEntries.id),
    accountId: uuid("account_id").notNull().references(() => accounts.id),
    debitPaisa: paisa("debit_paisa").notNull().default(sql`0`),
    creditPaisa: paisa("credit_paisa").notNull().default(sql`0`),
    customerId: uuid("customer_id").references(() => customers.id),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    memo: text("memo"),
  },
  (t) => [
    index("jl_entry_idx").on(t.entryId),
    index("jl_account_idx").on(t.accountId),
    check("jl_valid", sql`${t.debitPaisa} >= 0 and ${t.creditPaisa} >= 0 and (${t.debitPaisa} = 0 or ${t.creditPaisa} = 0) and (${t.debitPaisa} + ${t.creditPaisa}) > 0`),
  ],
);

