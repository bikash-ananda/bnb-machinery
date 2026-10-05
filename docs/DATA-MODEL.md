# Data model (v1 outline — Claude Code turns this into Drizzle schemas, one module at a time)

Conventions: `id uuid pk` (v7), `created_at/updated_at timestamptz`, `created_by`, soft-delete via `archived_at` where needed,
money `bigint` paisa + `currency='NPR'`, quantities `numeric(14,3)`, all FKs indexed, enums as Postgres enums or CHECK.

## Auth / security
users(email unique, name, role_id, status, password_hash, totp_secret_enc, totp_enabled, failed_logins, locked_until, last_login_at)
roles(key), permissions(key), role_permissions(role_id, permission_id)
sessions(user_id, token_hash, ip, user_agent, created_at, last_seen_at, expires_at, revoked_at)
recovery_codes(user_id, code_hash, used_at), webauthn_credentials(user_id, credential_id, public_key, counter)
audit_log(actor_id, action, entity, entity_id, before jsonb, after jsonb, ip, at)   -- append-only
login_attempts(email, ip, at, success)

## Settings / CMS
settings(key, value jsonb), pages(slug, locale, title, blocks jsonb, status), media(path, mime, size, alt_en, alt_ne, owner)

## Catalog
categories(parent_id, slug, name_en, name_ne, sort), brands(slug, name, logo_media_id)
products(sku unique, slug, name_en, name_ne, description_en/ne, brand_id, category_id, model, hs_code?, tax_code_id,
         unit_id, track_stock bool, track_serial bool, warranty_months, status, published bool)
product_media(product_id, media_id, sort), product_specs(product_id, name_en/ne, value_en/ne, sort)
price_lists(name, currency, is_default), product_prices(price_list_id, product_id, price, mrp, min_qty, valid_from, valid_to)
units(code, name_en/ne)

## Inventory (append-only ledger)
locations(name, type: godown|shop|vehicle)
stock_movements(product_id, location_id, qty_delta, type: purchase|sale|return|adjust|transfer_in|transfer_out|reserve|release,
                ref_type, ref_id, unit_cost, batch_id?, serial_id?, note, at, by)   -- never updated/deleted
stock_balances(product_id, location_id, on_hand, reserved)    -- derived/maintained by trigger or service in same transaction
batches(product_id, code, expiry?), serials(product_id, serial_no, status, sold_invoice_id, warranty_until)
reorder_rules(product_id, location_id, min_qty, max_qty, preferred_supplier_id, lead_days)
stock_counts(location_id, status), stock_count_lines(count_id, product_id, counted, system, variance)

## Purchasing
suppliers(name, pan, phone, email, address, terms_days)
purchase_orders(number, supplier_id, status, expected_on), po_lines(po_id, product_id, qty, unit_cost, tax_code_id)
goods_receipts(po_id, received_on, supplier_invoice_no), grn_lines(grn_id, product_id, qty, unit_cost, batch?)
supplier_bills(supplier_id, bill_no, bill_date_ad/bs, taxable, vat, total)   -- feeds purchase VAT register

## Customers / sales
customers(type: person|business, name, pan?, vat_registered, phone, email, address, district, credit_limit, terms_days)
quotes(number, customer_id, status: draft|sent|accepted|rejected|expired, valid_until, notes, source), quote_lines(...)
orders(number, customer_id, channel: web|counter|whatsapp, status, delivery_method, address, payment_method), order_lines(...)
invoices(number, fiscal_year, type: tax|abbreviated, customer snapshot jsonb, issued_at, issued_date_bs, status: issued|cancelled,
         taxable_total, exempt_total, zero_rated_total, vat_total, grand_total, amount_in_words, print_count, cbms_status)
invoice_lines(invoice_id, product_id, description, qty, unit, unit_price, discount, taxable_value, tax_code_id, tax_rate_snapshot, tax_amount, total)
credit_notes(number, invoice_id, reason, ...same totals), debit_notes(...)
payments(customer_id, invoice_id?, method: cash|esewa|khalti|bank|cheque|credit, amount, reference, at), receipts(number, payment_id)
number_sequences(key, fiscal_year, next_value)  -- locked with SELECT ... FOR UPDATE to stay gapless

## Tax
tax_codes(key: VAT13|VAT_EXEMPT|VAT_ZERO|EXCISE_x..., name_en/ne, kind: vat|excise|tds|other, description)
tax_rates(tax_code_id, rate_bp, effective_from, effective_to, notes)     -- rate in basis points (13% = 1300)
fiscal_years(label '2083/84', start_ad, end_ad, start_bs, end_bs)

## Automation / comms
outbox(event, payload jsonb, status, attempts, run_at), jobs history handled by BullMQ
message_threads(channel, external_id, customer_id, status: bot|human|closed), messages(thread_id, direction, body, meta, at)
notification_templates(key, locale, channel, subject, body), notifications(to, channel, template_key, status, at)
assistant_policies(key, text_en/ne)   -- FAQs/policies the bot may quote; nothing else is "facts"
