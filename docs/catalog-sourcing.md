# Store catalog sourcing

The storefront combines B&B's existing product records with 95 researched online-market reference records (88 INGCO and 7 Deli). Reference prices and product availability are not B&B offers or inventory commitments.

## Sources

- INGCO Nepal's online product catalog, operated by B.H.S. Machinery Pvt. Ltd.: <https://ingconepal.com/products>. Product names, Nepal listings, indicative NPR prices, and source images are taken from individual product listings where available.
- INGCO's official catalog: <https://www.ingco.com/>. Matched models link to the manufacturer's model page and specifications. If no exact model match was found, the manufacturer link points to its relevant catalog category and the product image remains credited to the Nepal listing.
- Deli's official catalog: <https://www.delitoolsglobal.com/products/>. The seven Deli product images and manufacturer details link to the corresponding official product pages.
- Nepal market price references for Deli items: individual Hardwarepasal listings where available, or its power-tools listing for items without an individual product page. Each record has its own `sourceUrl`.

## Store behavior

- Market prices are kept in `marketPrice`, separate from B&B's actual `price`. The checkout API reads the B&B price and does not accept the reference price as an amount due.
- Reference-priced products are added to the quote/order request flow. The customer sees the external rate for comparison, but must wait for B&B to confirm stock, warranty, final price, and delivery before paying.
- Product cards and details expose the manufacturer page and Nepal price source. The checked-on date is attached to each reference record.
- This is a curated snapshot rather than a live feed. Re-run `node scripts/build-market-catalog.mjs` when refreshing the INGCO selection; review prices and model matches before publishing a refreshed catalog.

## Payment QR limitation

The supplied ADBL, Nabil, and eSewa images are static merchant QR codes. A static code does not become a provider-valid amount-bearing payment request by drawing a new QR around account details and an amount. The checkout displays the confirmed amount next to the supplied QR and tells the buyer to enter it manually. A genuinely dynamic QR requires enrollment and payment-request support from the relevant bank/wallet or Nepal's QR/acquirer rails, plus server-side verification before an order is marked paid.
