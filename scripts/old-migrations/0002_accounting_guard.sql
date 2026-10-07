CREATE TRIGGER journal_lines_immutable BEFORE UPDATE OR DELETE ON journal_lines FOR EACH ROW EXECUTE FUNCTION forbid_ledger_change();
--> statement-breakpoint
CREATE TRIGGER journal_entries_immutable BEFORE UPDATE OR DELETE ON journal_entries FOR EACH ROW EXECUTE FUNCTION forbid_ledger_change();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION check_entry_balanced() RETURNS trigger AS $$
DECLARE d numeric; c numeric;
BEGIN
  SELECT COALESCE(SUM(debit_paisa),0), COALESCE(SUM(credit_paisa),0) INTO d, c FROM journal_lines WHERE entry_id = NEW.entry_id;
  IF d <> c THEN RAISE EXCEPTION 'Journal entry % is not balanced (Dr % <> Cr %)', NEW.entry_id, d, c; END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER journal_lines_balanced AFTER INSERT ON journal_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_entry_balanced();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION forbid_closed_year() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM fiscal_years WHERE label = NEW.fiscal_year AND status = 'CLOSED') THEN
    RAISE EXCEPTION 'Fiscal year % is closed. Post to the open year or reopen with approval.', NEW.fiscal_year;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER journal_entries_period BEFORE INSERT ON journal_entries FOR EACH ROW EXECUTE FUNCTION forbid_closed_year();
