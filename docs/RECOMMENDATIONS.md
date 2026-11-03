# ML product recommendations

The app recommends products in two places:

- **Product detail → "You May Also Like"**: the products most similar to the one being viewed.
- **Home → "Recommended for You"**: products similar to what is in the user's cart and wishlist. When both are empty, this row shows "Popular Picks" instead, chosen by rating weighted by review count, with one product per category.

## How it works

The recommender is **content-based**. Each product is described by its name, category, description and tags (`productText()` in `lib/products.ts`). That text is turned into a vector, and recommendations are the products whose vectors are closest by cosine similarity.

There are two ways to compute the vectors. The app uses whichever one works:

| | Server-side ML (primary) | On-device fallback |
|---|---|---|
| Vectors | 384-dim **gte-small** sentence embeddings | TF-IDF over the catalog text |
| Computed by | `supabase/functions/embed-products` (Supabase Edge Runtime's built-in model) | `lib/recommendations.ts` |
| Search | pgvector HNSW index, cosine distance, in Postgres | in-memory cosine similarity |
| Used when | the migration is applied and embeddings exist | the backend isn't set up, there are no embeddings, or the device is offline |

When the ML results are used, the row shows an **✨ AI** badge. The screen first shows the on-device results right away, then replaces them with the server results when those arrive.

To get recommendations for a user, the vectors of the products in their cart and wishlist are averaged into a single "taste" vector (`recommend_products`). Products already in the cart or wishlist are left out.

## Files

| File | Purpose |
|---|---|
| `lib/products.ts` | Product type and the bundled fallback catalog (30 products) |
| `lib/recommendations.ts` | Remote RPC calls, TF-IDF fallback, `useSimilarProducts` and `useRecommendations` hooks |
| `components/RecommendedProducts.tsx` | Horizontal card row used by both screens |
| `supabase/migrations/20261102000000_product_recommendations.sql` | `products` table, pgvector index, RLS, `match_similar_products`, `recommend_products` |
| `supabase/seed/products.sql` | Catalog seed, generated from `lib/products.ts` |
| `supabase/functions/embed-products/index.ts` | Edge function that fills in missing embeddings |
| `scripts/generate-product-seed.mjs` | Regenerates the seed SQL |

## Setup (one time)

Follow [PRODUCT_DATA.md](PRODUCT_DATA.md#setup-one-time). Applying the migrations,
deploying `embed-products` and running `scripts/import-products.mjs` also
generates the embeddings. Until then, the app uses the on-device recommender.

To re-generate embeddings by hand, call the function. It handles 40 products per call
by default, and the response's `remaining` says how many are left:

```bash
curl -X POST "https://lgdjadfaigbhqvwcnrxm.supabase.co/functions/v1/embed-products" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

## Changing the catalog

1. Edit products in the Supabase dashboard, or re-run `scripts/import-products.mjs`.
   (`lib/products.ts` and `supabase/seed/products.sql` are only the offline fallback catalog.)
2. Call `embed-products` again; the import script does this for you. A trigger clears the embedding of any product whose name, category, description or tags change, so only those products are re-embedded. To re-embed everything, send `{"all": true}` as the body.

## Ideas for next steps

- **Collaborative filtering**: log views, add-to-cart events and orders to an `events` table. Then blend "people who bought X also bought Y" scores with the content similarity.
- **Semantic search**: embed the user's search query with the same model and reuse the vector index.
