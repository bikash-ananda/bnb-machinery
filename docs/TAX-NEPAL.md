# Nepal tax & billing — design + what must be verified

Research date: October 2026. Sources disagree on several figures. **Everything marked VERIFY must be confirmed by your
accountant / the Inland Revenue Department (IRD) before go-live.** The system keeps all of it configurable.

## Facts we are fairly confident about
- Standard VAT rate is **13%** (VAT Act 2052). Some supplies are **exempt** (Schedule 1) and exports are **zero-rated**.
- A VAT tax invoice ("कर बीजक / Tax Invoice", VAT Rules Rule 17) shows: supplier name, address, PAN; sequential serial number;
  date (store AD and BS); buyer name, address, PAN (if registered); description, quantity, unit rate; taxable value; VAT rate and amount;
  total in figures and in words; authorised signature/stamp.
- Invoice numbers are sequential, unique, gapless, per fiscal year. Fiscal year runs **Shrawan 1 to Ashadh end** (about mid-July to mid-July).
- Issued bills must not be edited or deleted; corrections use credit/debit notes.
- Records are kept for **6 years** (VAT / income tax).
- IRD runs the **Central Billing Monitoring System (CBMS)**. Large taxpayers/prescribed sectors must issue invoices from IRD-approved
  billing software connected to CBMS. The Finance Act 2083 (effective about 17 July 2026) replaced VAT Act section 14क so IRD can mandate
  its own billing system — **the rollout may change; watch IRD notices.**

## VERIFY (conflicting or time-sensitive)
1. ~~Is e-billing/CBMS mandatory for B & B?~~ **Owner states: VAT-registered, e-billing NOT mandatory, turnover about NPR 5 crore (2026-10-05).**
   Get this confirmed in writing by the accountant. Sources quote e-billing thresholds around NPR 10 crore and up; rules change by Finance Act and IRD notice,
   and the Finance Act 2083 lets IRD mandate its own billing system. **Re-check every Shrawan (new fiscal year) and whenever turnover approaches the threshold.**
2. While not mandatory: the `ird-cbms` adapter stays disabled. If it becomes mandatory, a self-built system may need IRD approval or you must use IRD's own system.
3. VAT registration threshold (sources differ: e.g. goods NPR 50 lakh / services 30 lakh) and whether B & B is VAT-registered.
4. Abbreviated tax invoice limit (sources differ between about NPR 5,000 and 10,000).
5. Whether the machinery/spare-part/tool categories sold are standard-rated, exempt, or zero-rated (some agricultural inputs may differ). Decide per product category.
6. Excise duty, TDS (withholding) rates, and any other levy that applies to specific sales/purchases.
7. Triplicate/copy rules and "Copy of original" printing wording for reprints.
8. Rounding rules on invoices.
9. **Invoice printing authority:** for a VAT-registered business that is NOT under e-billing, may invoices be printed from our own software, or must they be on
   IRD-approved pre-numbered stationery / from an approved printer or approved software? Ask the accountant before the first real invoice is issued.

## Engine design (`src/modules/tax`)
- `tax_codes` + effective-dated `tax_rates` (basis points). Product has a `tax_code_id`; invoice line stores a **snapshot** of code + rate used.
- Kinds: `vat` (13%, exempt, zero-rated), `excise`, `tds`, `other`. Exempt and zero-rated both carry 0% but are reported in different columns.
- Prices may be entered tax-exclusive or tax-inclusive (setting). Calculation: per line, taxable = qty*price - discount; tax = round_half_up(taxable*rate); invoice totals are sums of lines.
- Discounts are applied before tax; show net taxable value per line and totals per tax bucket (taxable, exempt, zero-rated, VAT).
- `amount_in_words` in English and Nepali. Dates shown in BS and AD.
- Reports: sales register, purchase register, VAT summary (output - input), TDS summary — export to CSV/Excel for the accountant.
- Credit/debit notes reverse or add tax with reference to the original invoice number.
- Reprints increment `print_count` and print "COPY OF ORIGINAL".
- Adapter `ird-cbms`: interface `submitInvoice / submitCreditNote / status`. Off by default; enable only after IRD confirms the path (VERIFY 1–2).

## Acceptance tests to write first (Vitest)
13% on a Rs 90,000 sale = Rs 11,700 (total 1,01,700); mixed cart (13% + exempt + zero-rated); inclusive vs exclusive pricing; discount before tax;
rounding on many lines; credit note totals; gapless numbering under concurrent issue; fiscal-year rollover on Shrawan 1; BS date conversion edge cases.
