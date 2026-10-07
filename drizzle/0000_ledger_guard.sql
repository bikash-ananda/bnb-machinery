CREATE OR REPLACE FUNCTION forbid_ledger_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed (append-only / immutable)', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER stock_movements_immutable BEFORE UPDATE OR DELETE ON stock_movements FOR EACH ROW EXECUTE FUNCTION forbid_ledger_change();
--> statement-breakpoint
CREATE TRIGGER invoice_items_immutable BEFORE UPDATE OR DELETE ON invoice_items FOR EACH ROW EXECUTE FUNCTION forbid_ledger_change();
--> statement-breakpoint
CREATE TRIGGER invoices_no_delete BEFORE DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION forbid_ledger_change();
