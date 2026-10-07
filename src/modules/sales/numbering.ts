import { sql } from "drizzle-orm";
import type { Tx } from "../../db/client";

/** Gapless counter. Runs inside the caller's transaction, so a rollback never burns a number. */
export async function nextSeq(tx: Tx, key: string, fiscalYear: string): Promise<number> {
  const r = await tx.execute(
    sql`insert into document_sequences (key, fiscal_year, last_seq) values (${key}, ${fiscalYear}, 1)
        on conflict (key, fiscal_year) do update set last_seq = document_sequences.last_seq + 1
        returning last_seq`,
  );
  return Number((r.rows[0] as { last_seq: number }).last_seq);
}
