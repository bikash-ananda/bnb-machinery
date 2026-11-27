# Manual payment verification

## Purpose

This module records customer-submitted bank or wallet transaction references as **claims only**. It does not automatically mark an order paid. A permitted staff member must check the actual merchant bank/wallet statement and verify the received amount.

## Flow

1. An owner/admin configures active payment accounts and optional static merchant QR images.
2. The public checkout can list active accounts without exposing stored QR bytes in the account-list response.
3. A customer submits an order number, phone number, payment account/method and transaction reference.
4. The server validates the order/phone pair, prevents duplicate active transaction references, and stores a PENDING submission.
5. An authorized verifier checks the transaction in the actual bank/wallet account.
6. Verification locks the submission and order, checks the invoice and remaining due amount, then records the payment through the existing sales/accounting posting path in one database transaction.
7. Rejection records a reason and does not create a payment or accounting entry.

## Security and accounting rules

- Customer-submitted references are untrusted claims; never treat them as proof of payment.
- Do not ask customers for PINs, passwords, OTPs or banking credentials.
- QR uploads accept PNG/JPEG/WebP image signatures only and are size-limited.
- Customer order lookup requires both order number and a full phone number match.
- Duplicate references are blocked while PENDING or VERIFIED; a rejected reference may be resubmitted.
- Amounts use integer paisa. Partial payments are supported; overpayments are rejected.
- Payment verification requires an issued invoice and a non-cancelled order.
- The payment row, accounting posting, order payment status and submission verification status commit or roll back together.
- Merchant accounts and QR images are empty until an authorized owner supplies verified account details. No bank account, payee or QR data is seeded.

## Deployment

Migration `0011_manual_payments.sql` is additive. Review and back up production before applying it. Do not apply migrations or deploy from this pull request without owner approval.
