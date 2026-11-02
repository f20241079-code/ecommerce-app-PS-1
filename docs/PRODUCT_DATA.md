# Real product data

The app loads its catalog from the Supabase `products` table instead of
lists written into each screen. The data comes from
[DummyJSON](https://dummyjson.com/products): about 190 products in about 20 categories, with
real photos, brands, prices and discounts, ratings, stock levels, shipping,
warranty and return information, and customer reviews.

DummyJSON is free sample data made for prototypes. It is not a real store's inventory. Once
it's imported, it's your own data in Supabase, and you can edit or add products from the
Supabase dashboard.

## What changed in the app

| Screen | Now shows |
|---|---|
| Home | Real categories, banners for real categories, best-rated deals as "Featured", all products with photos ("Show more" loads 20 at a time) |
| Category | Products in that category, with photos, sorting and real discounts |
| Search | Matches name, brand, category and tags; quick tags are the biggest categories; "Trending" lists the best-rated products |
| Product detail | Photo gallery, brand, stock level, shipping/warranty/returns, customer reviews, ML "You May Also Like" |
| Cart / Wishlist / Checkout | Product photos |

**Offline fallback:** if Supabase can't be reached, or the table hasn't been imported yet, the app uses the
bundled 30-product catalog in `lib/products.ts`, so it never shows an empty
screen.

## Setup (one time)

You need the service role key from Supabase: **Project Settings → API → `service_role`**.
The import script uses it to write data. **Never put it in the app or commit it.**

1. **Apply the database migrations** in order. Either paste each file into the Supabase SQL
   Editor and run it, or run `supabase db push`:
   - `supabase/migrations/20261102000000_product_recommendations.sql`
   - `supabase/migrations/20261103000000_real_product_data.sql`
   - `supabase/migrations/20261104000000_orders_and_addresses.sql` (addresses, orders, checkout)

2. **Deploy the embedding function.** This is optional, but it switches on the ✨ AI recommendations:

   ```bash
   supabase functions deploy embed-products
   ```

3. **Import the products.** Run this from the project folder.

   Windows PowerShell:

   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY="paste-key-here"; node scripts/import-products.mjs
   ```

   macOS / Linux:

   ```bash
   SUPABASE_SERVICE_ROLE_KEY=paste-key-here node scripts/import-products.mjs
   ```

   The script downloads the catalog, upserts the products, replaces their reviews, removes
   the old 30 sample products, and then generates the ML embeddings. Re-running it is safe.
   To keep products you added yourself, pass `--keep-existing`.

4. **Restart the app.** It now shows the live catalog.

## Files

| File | Purpose |
|---|---|
| `lib/productsApi.ts` | Loads the catalog once and shares it between screens (`useCatalog`, `useProduct`, `useCategories`, `useProductReviews`), plus search and price helpers |
| `lib/products.ts` | `Product` type, bundled fallback catalog, current-catalog store |
| `components/ProductImage.tsx` | Product photo with the emoji as a fallback |
| `scripts/import-products.mjs` | DummyJSON → Supabase importer |
| `supabase/migrations/20261103000000_real_product_data.sql` | New product columns, `product_reviews` table, updated recommendation functions |
| `supabase/migrations/20261104000000_orders_and_addresses.sql` | Per-user `addresses`, `orders`, `order_items`; `place_order` / `cancel_order` functions |
| `lib/account.ts` | Addresses, orders and profile stats for the signed-in user |

## Notes

- Reviewer email addresses from DummyJSON are deliberately not imported.
- Prices: DummyJSON's `price` is stored as `original_price`, and `price` is the
  price after `discountPercentage` is applied.

## Accounts, addresses and orders

- **Addresses** (Profile → Address Management, or during checkout): add, edit, delete and
  set a default. The first address becomes the default automatically.
- **Checkout** places a real order through the `place_order` database function. It takes
  prices, discounts and stock from the `products` table, not from the app, so the app can't
  change what an order costs. Stock goes down when an order is placed. Delivery is free from $50.
- **Order History** shows your orders with their items, delivery address and savings.
  **Cancel** works while the order is still "Processing" and puts the stock back.
  **Reorder** adds the items to the cart again.
- **Profile** shows your real order count, wishlist count, address count and total saved.
- Row level security means each user can only read and change their own addresses and
  orders. Orders can't be written directly; they are only created through `place_order`.
- To move an order along, change its `status` to `shipped` or `delivered` in the
  Supabase table editor. There is no admin screen yet.
- This is a demo store: **no payment is collected**.
