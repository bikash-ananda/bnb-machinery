# B & B Machinery — Master Database

**Status:** Foundation specification  
**Database:** PostgreSQL 16  
**ORM and migrations:** Drizzle ORM + drizzle-kit  
**Application:** Next.js modular monolith  
**Currency:** NPR; monetary values are stored as integer paisa  
**Quantity precision:** `numeric(14,3)`  
**Primary identifiers:** UUIDs, with stable human-readable document numbers and product SKUs

This document is the central reference for the B & B Machinery business database. The PostgreSQL database is the authoritative source for operational data. Website pages, admin screens, POS, inventory, customer portal, reports and future ERP integrations must use the same server-side domain services and database—not separate competing product or stock stores.

## 1. Existing database foundation

The repository already contains Drizzle schema modules exported through `src/db/schema.ts`:

| Domain | Existing schema module | Main responsibility |
|---|---|---|
| Product catalogue | `src/modules/catalog/schema.ts` and `extras-schema.ts` | Categories, brands, products, product images and catalogue details |
| Inventory | `src/modules/inventory/schema.ts` | Stock locations, append-only stock movements, balances and reservations |
| Customers | `src/modules/customers/schema.ts` | Customer records and customer classification |
| Sales | `src/modules/sales/schema.ts` | Orders, order lines, invoices, invoice lines, payments and document sequences |
| Purchasing | `src/modules/purchasing/schema.ts` | Suppliers, purchase bills, purchase items and supplier payments |
| Accounting | `src/modules/accounting/schema.ts` | Chart of accounts, fiscal years and journal entries/lines |
| Automation | `src/modules/automation/schema.ts` | Background automation and communication records |
| Local workflow | `src/modules/local-workflow/schema.ts` | Existing local inventory/admin workflow; keep distinct until a safe, verified migration maps it into the canonical catalogue |
| Support | `src/modules/support/schema.ts` | Customer support/service domain |

The current architecture is a single PostgreSQL database with modular domain schemas. Do not introduce Supabase, a second PostgreSQL instance, or a second catalogue as a parallel source of truth.

## 2. Master entity relationships

The intended business lifecycle is:

```text
Company
 ├── Business locations / warehouses
 ├── Users ── Roles ── Permissions
 ├── Brands ── Categories ── Products
 │                         ├── Models / Part numbers
 │                         ├── Specifications / Applications
 │                         ├── Media / Documents
 │                         ├── Price lists / Price history
 │                         └── Stock balances (derived from movements)
 ├── Suppliers ── Purchase orders ── Goods receipts ── Purchase bills ── Supplier payments
 ├── Customers ── Inquiries ── Quotations ── Orders ── Invoices ── Payments
 │                                                └── Delivery / tracking
 ├── Service requests ── Service jobs ── Parts used
 ├── Accounting ── Journals ── Fiscal years / tax records
 └── Audit log / outbox / notifications
```

Use stable foreign keys between entities. Human-readable SKUs, quotation numbers, order numbers, invoice numbers and receipt numbers are unique business identifiers, not database primary keys.

## 3. Data ownership and rules

1. PostgreSQL is the authoritative master database for products, customers, suppliers, pricing, stock, sales and accounting.
2. All writes go through server-side domain services and validated inputs. Never connect a browser directly to PostgreSQL.
3. Stock is changed only through an auditable stock-movement service. Do not edit a stock balance as an ordinary product field.
4. Issued financial documents must be immutable; corrections use controlled credit/debit note or reversal workflows.
5. Store money as integer paisa and quantity with explicit unit precision. Do not use floating-point arithmetic for money.
6. Preserve historical product/customer/tax snapshots on issued documents so later master-data edits cannot rewrite history.
7. Keep English and Nepali display fields separate or use the existing locale architecture. Never use translated labels as IDs.
8. Use soft archival for master records where historical transactions reference them. Do not cascade-delete financial or stock history.
9. Record important changes with actor, timestamp, action and entity reference. Keep audit history append-only.
10. Integrations (email, messaging, AI, storage, payments and ERP) must be replaceable server-side adapters. Credentials belong in server environment secrets, never in browser code.
11. Do not seed invented brands, products, models, part numbers, prices, suppliers, stock quantities, tax registrations or certifications.
12. Keep backups and restore tests as part of database operations. Migrations must be additive and reviewed before production execution.

## 4. B & B Machinery company master record

The company profile used by the application must distinguish the public trading identity from the legal registration identity.

| Field | Value / status | Source |
|---|---|---|
| Public business name | B & B Machinery | Confirmed project business profile |
| Registered firm name | B And B Machinery Suppliers | Firm registration certificate in the uploaded two-page PDF |
| Current business address | Baglung Buspark, Pokhara, Kaski, Gandaki Province, Nepal | Confirmed project business profile |
| Registered address on certificate | Pokhara Metropolitan City–02, Kaski | Firm registration certificate; retain as historical registration address, not current shop address |
| Main phone | +977 9856088600 | Confirmed project business profile |
| WhatsApp / Viber | 9856088600 | Confirmed project business profile |
| Business email | bnbmachinery@gmail.com | Confirmed project business profile |
| Service areas | Kaski, Baglung, Mustang, Syangja | Confirmed project business profile |
| Languages | English and नेपाली | Confirmed project business profile |

The company profile should be editable by an authorized owner/admin, with changes recorded in the audit log. Keep the legal name, public name, current contact address and historical registration address as distinct fields.

## 5. Uploaded document review and data-import decision

The uploaded PDF contains two scanned pages:

- Page 1: a private-firm registration certificate naming **B And B Machinery Suppliers**. It records the proprietor and a registered address in Pokhara Metropolitan City–02, Kaski.
- Page 2: a PAN registration certificate. Its printed business name appears to be **कविन पशुपन्छी तथा कृषि फार्म**, which does not match the B & B Machinery registered firm name on page 1.

**Important verification hold:** Do not attach the page-2 PAN certificate or its PAN number to the B & B Machinery company record until the owner/accountant verifies that it belongs to the same legal entity and confirms the correct current PAN certificate. The mismatch must not be silently reconciled. Personal citizenship numbers, personal identity details and tax identifiers must not be copied into public website content, demo data, analytics or source code.

Store original legal documents in private, access-controlled document storage. The database should retain document metadata (document type, storage key, issue/expiry dates where applicable, verification status, verified by and verified at), not public file URLs. Do not commit scans or secret identifiers to Git.

## 6. Canonical master-data domains

### Catalogue
- Brands and hierarchical categories
- Products with unique SKU, slug, optional barcode, model and part number
- Product variants where needed
- Multilingual names and descriptions
- Specifications and applications as structured, validated attributes
- Product media, brochures and manuals with private/public visibility
- Price lists, price history, fixed-price or price-on-request status
- Product publication and approval workflow

### Inventory and procurement
- Warehouses, shops and other stock locations
- Append-only stock movement ledger, reservations and derived balances
- Batches, serial numbers and warranty tracking where applicable
- Suppliers and supplier-product relationships
- Purchase orders, goods receipts, supplier bills and supplier payments
- Stock counts, adjustments, transfers and reorder rules

### Customers and commerce
- Individual/business customer profiles and contact methods
- Inquiries from website, phone, WhatsApp, Viber and staff entry
- Quotations with versioned line items and validity
- Cart and server-side price revalidation
- Orders, fulfilment, delivery and tracking
- Invoices, receipts, payments, refunds and credit/debit notes
- Customer portal access and order history

### Service and machinery support
- Service requests and technical consultation
- Equipment/machine details and serial numbers where supplied
- Service jobs, assigned technicians, status history and parts used
- Rental requests only when the business confirms rental offerings

### Finance, security and operations
- Fiscal years, verified tax codes/rates and accounting journals
- Role-based access, sessions and secure account recovery
- Append-only audit log
- Transactional outbox, notifications and integration job history
- Backups, exports, data-retention and restore procedures

## 7. Safe implementation sequence

1. Review the live database schema and migration history before any schema change.
2. Confirm which existing modules/tables are already deployed; repository schema presence alone does not prove production migration success.
3. Add company profile, branch/location and private legal-document metadata as additive migrations only after confirming there is no existing equivalent table.
4. Map existing local workflow records into canonical catalogue records only after duplicate detection and owner review. Do not delete the source records during migration.
5. Add missing inquiry, quotation, delivery and service modules by extending existing schemas, not creating duplicate entities.
6. Import only verified company master data. Keep products, brands, supplier records, prices and stock empty until real records are supplied.
7. Run migration checks, typecheck, lint, tests, database smoke tests and backup/restore verification before deployment.

## 8. Production safety checklist

- [ ] Production database backup completed and restore tested
- [ ] Current migration journal and deployed migration state reconciled
- [ ] No destructive migration, table drop or database reset
- [ ] Company legal name and PAN ownership verified by owner/accountant
- [ ] Admin roles and permissions reviewed
- [ ] Database reachable only on the private Docker network
- [ ] Secrets stored server-side
- [ ] Audit trail and stock ledger checks pass
- [ ] No sample/fabricated business data appears in production
- [ ] Migration and application smoke tests pass

