CREATE TRIGGER purchase_bill_items_immutable BEFORE UPDATE OR DELETE ON purchase_bill_items FOR EACH ROW EXECUTE FUNCTION forbid_ledger_change();
--> statement-breakpoint
CREATE TRIGGER purchase_bills_no_delete BEFORE DELETE ON purchase_bills FOR EACH ROW EXECUTE FUNCTION forbid_ledger_change();
--> statement-breakpoint
CREATE TRIGGER supplier_payments_immutable BEFORE UPDATE OR DELETE ON supplier_payments FOR EACH ROW EXECUTE FUNCTION forbid_ledger_change();
