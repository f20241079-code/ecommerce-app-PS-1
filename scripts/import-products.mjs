/**
 * Imports a real product catalog from DummyJSON (https://dummyjson.com) into
 * the Supabase `products` and `product_reviews` tables, then asks the
 * `embed-products` edge function to compute ML embeddings for recommendations.
 *
 * Usage (needs the service role key from Supabase → Project Settings → API;
 * never put that key in the app):
 *
 *   macOS / Linux:
 *     SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-products.mjs
 *
 *   Windows PowerShell:
 *     $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/import-products.mjs
 *
 * Optional: SUPABASE_URL (defaults to this project's URL),
 *           --keep-existing  (don't delete products that aren't in the import).
 *
 * Safe to re-run: products are upserted by id and their reviews replaced.
 */
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";

const DEFAULT_SUPABASE_URL = "https://lgdjadfaigbhqvwcnrxm.supabase.co";
const SOURCE_URL = "https://dummyjson.com/products?limit=0";

const CATEGORY_ICONS = {
  beauty: "💄", fragrances: "🌸", furniture: "🛋️", groceries: "🛒",
  "home-decoration": "🏠", "kitchen-accessories": "🍳", laptops: "💻",
  "mens-shirts": "👔", "mens-shoes": "👞", "mens-watches": "⌚",
  "mobile-accessories": "🔌", motorcycle: "🏍️", "skin-care": "🧴",
  smartphones: "📱", "sports-accessories": "⚽", sunglasses: "🕶️",
  tablets: "📲", tops: "👚", vehicle: "🚗", "womens-bags": "👜",
  "womens-dresses": "👗", "womens-jewellery": "💍", "womens-shoes": "👠",
  "womens-watches": "⌚",
};

const round2 = (n) => Math.round(n * 100) / 100;

function badgeFor(p, discount) {
  if (typeof p.stock === "number" && p.stock > 0 && p.stock < 10) return "Low Stock";
  if (p.rating >= 4.7) return "Top Rated";
  if (discount >= 15) return "Sale";
  if (p.rating >= 4.3) return "Popular";
  return null;
}

/** Convert one DummyJSON product into a `products` row. Exported for tests. */
export function toProductRow(p) {
  const listPrice = Number(p.price) || 0;
  const discount = Math.max(0, Math.min(90, Number(p.discountPercentage) || 0));
  const salePrice = round2(listPrice * (1 - discount / 100));
  const reviews = Array.isArray(p.reviews) ? p.reviews : [];
  const category = String(p.category ?? "other");

  return {
    id: String(p.id),
    name: String(p.title ?? "Untitled product").trim(),
    price: salePrice,
    original_price: round2(listPrice),
    rating: Math.max(0, Math.min(5, Math.round((Number(p.rating) || 0) * 10) / 10)),
    reviews: reviews.length,
    icon: CATEGORY_ICONS[category] ?? "🛍️",
    category,
    badge: badgeFor(p, discount),
    description: String(p.description ?? "").trim(),
    tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
    brand: p.brand ? String(p.brand) : null,
    images: Array.isArray(p.images) ? p.images.filter((u) => typeof u === "string") : [],
    thumbnail: typeof p.thumbnail === "string" ? p.thumbnail : null,
    stock: Number.isFinite(Number(p.stock)) ? Number(p.stock) : null,
    availability_status: p.availabilityStatus ?? null,
    warranty: p.warrantyInformation ?? null,
    shipping: p.shippingInformation ?? null,
    return_policy: p.returnPolicy ?? null,
  };
}

/** Convert a product's DummyJSON reviews into `product_reviews` rows. Exported for tests. */
export function toReviewRows(p) {
  const reviews = Array.isArray(p.reviews) ? p.reviews : [];
  return reviews
    .filter((r) => Number.isFinite(Number(r.rating)))
    .map((r) => ({
      product_id: String(p.id),
      rating: Math.max(1, Math.min(5, Math.round(Number(r.rating)))),
      comment: String(r.comment ?? ""),
      // Reviewer emails are deliberately not stored.
      reviewer_name: String(r.reviewerName ?? "Anonymous"),
      created_at: r.date && !Number.isNaN(Date.parse(r.date)) ? new Date(r.date).toISOString() : undefined,
    }));
}

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

async function main() {
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const keepExisting = process.argv.includes("--keep-existing");
  if (!key) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY. See the usage notes at the top of this file.");
    process.exit(1);
  }

  console.log(`Downloading products from ${SOURCE_URL} ...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`DummyJSON returned HTTP ${res.status}`);
  const json = await res.json();
  const source = Array.isArray(json.products) ? json.products : [];
  if (source.length === 0) throw new Error("DummyJSON returned no products");

  const products = source.map(toProductRow);
  const reviews = source.flatMap(toReviewRows);
  const ids = products.map((p) => p.id);
  console.log(`Got ${products.length} products and ${reviews.length} reviews.`);

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  for (const batch of chunk(products, 100)) {
    const { error } = await supabase.from("products").upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`Upserting products failed: ${error.message}`);
  }
  console.log(`Upserted ${products.length} products.`);

  if (!keepExisting) {
    const { error, count } = await supabase
      .from("products")
      .delete({ count: "exact" })
      .not("id", "in", `(${ids.map((id) => `"${id}"`).join(",")})`);
    if (error) throw new Error(`Removing old products failed: ${error.message}`);
    if (count) console.log(`Removed ${count} products that are no longer in the catalog.`);
  }

  for (const batch of chunk(ids, 100)) {
    const { error } = await supabase.from("product_reviews").delete().in("product_id", batch);
    if (error) throw new Error(`Clearing old reviews failed: ${error.message}`);
  }
  for (const batch of chunk(reviews, 500)) {
    const { error } = await supabase.from("product_reviews").insert(batch);
    if (error) throw new Error(`Inserting reviews failed: ${error.message}`);
  }
  console.log(`Inserted ${reviews.length} reviews.`);

  // Compute embeddings in batches (the edge function handles `limit` per call).
  console.log("Generating ML embeddings via the embed-products edge function ...");
  let total = 0;
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${url}/functions/v1/embed-products`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 40 }),
    });
    if (r.status === 404) {
      console.warn(
        "The embed-products function isn't deployed. Run `supabase functions deploy embed-products`,\n" +
          "then re-run this script. Until then the app uses its on-device recommender."
      );
      break;
    }
    if (!r.ok) {
      console.warn(`embed-products returned HTTP ${r.status}: ${await r.text()}`);
      break;
    }
    const out = await r.json();
    total += out.embedded ?? 0;
    if (out.failed?.length) console.warn(`Failed to embed: ${out.failed.join(", ")}`);
    if (!out.remaining) break;
  }
  if (total) console.log(`Embedded ${total} products.`);
  console.log("Done.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
}
