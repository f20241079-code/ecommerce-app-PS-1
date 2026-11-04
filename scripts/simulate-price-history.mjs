/**
 * OPTIONAL: fills `price_history` with SIMULATED past prices so the
 * price-vs-time charts have something to show in a demo.
 *
 * Real history builds up on its own: a database trigger records a point
 * every time a product's price changes. DummyJSON has no historical
 * prices, so a fresh install starts with one point per product. This
 * script adds made-up earlier points, all marked source = 'simulated';
 * the app labels charts containing them as "Demo data".
 *
 * Usage (service role key from Supabase → Project Settings → API):
 *   Windows PowerShell:
 *     $env:SUPABASE_SERVICE_ROLE_KEY="..."; node scripts/simulate-price-history.mjs
 *   macOS / Linux:
 *     SUPABASE_SERVICE_ROLE_KEY=... node scripts/simulate-price-history.mjs
 *
 * Options:  --days 365   how far back to simulate (default 365 = 12 months, max 730)
 *           --remove     delete all simulated points and exit
 *
 * Safe to re-run: previous simulated points are replaced. Recorded points
 * are never touched.
 */
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";

const DEFAULT_SUPABASE_URL = "https://lgdjadfaigbhqvwcnrxm.supabase.co";
const DAY = 24 * 60 * 60 * 1000;

/** Small deterministic PRNG so each product gets the same history every run. */
function rng(seedText) {
  let h = 2166136261;
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Simulated price changes for one product, oldest first, all strictly before
 * `endTime`. Prices move between 70% and 100% of the list price, in steps
 * every 4–21 days, like sales starting and ending. Exported for tests.
 */
export function simulateHistory(product, endTime, days) {
  const random = rng(String(product.id));
  const list = Number(product.original_price) || Number(product.price);
  const points = [];
  let t = endTime - days * DAY;
  let price = Number(product.price);
  while (t < endTime - DAY) {
    const r = random();
    // Mostly small moves, sometimes a sale or a return to list price.
    if (r < 0.15) price = list;
    else if (r < 0.3) price = list * (0.7 + random() * 0.15);
    else price = price * (0.94 + random() * 0.12);
    price = Math.min(list, Math.max(list * 0.7, price));
    const last = points[points.length - 1];
    if (last && last.price === round2(price)) {
      t += (4 + Math.floor(random() * 18)) * DAY;
      continue; // no change, no new point
    }
    points.push({
      product_id: String(product.id),
      price: round2(price),
      original_price: round2(list),
      source: "simulated",
      recorded_at: new Date(t).toISOString(),
    });
    t += (4 + Math.floor(random() * 18)) * DAY;
  }
  return points;
}

async function main() {
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY. See the usage notes at the top of this file.");
    process.exit(1);
  }
  const daysArg = process.argv.indexOf("--days");
  const days = Math.min(730, Math.max(14, daysArg > 0 ? Number(process.argv[daysArg + 1]) || 365 : 365));
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { error: delError, count } = await supabase
    .from("price_history")
    .delete({ count: "exact" })
    .eq("source", "simulated");
  if (delError) throw new Error(`Removing old simulated points failed: ${delError.message}`);
  console.log(`Removed ${count ?? 0} old simulated points.`);
  if (process.argv.includes("--remove")) return;

  const { data: products, error } = await supabase.from("products").select("id, price, original_price");
  if (error) throw new Error(`Loading products failed: ${error.message}`);

  // Simulated points must end before each product's first real (recorded) point.
  const { data: firstRecorded, error: histError } = await supabase
    .from("price_history")
    .select("product_id, recorded_at")
    .eq("source", "recorded")
    .order("recorded_at", { ascending: true });
  if (histError) throw new Error(`Loading price history failed: ${histError.message}`);
  const firstAt = new Map();
  for (const r of firstRecorded ?? []) if (!firstAt.has(r.product_id)) firstAt.set(r.product_id, Date.parse(r.recorded_at));

  const rows = (products ?? []).flatMap((p) => simulateHistory(p, firstAt.get(p.id) ?? Date.now(), days));
  for (let i = 0; i < rows.length; i += 500) {
    const { error: insError } = await supabase.from("price_history").insert(rows.slice(i, i + 500));
    if (insError) throw new Error(`Inserting simulated points failed: ${insError.message}`);
  }
  console.log(`Added ${rows.length} simulated points for ${products?.length ?? 0} products (${days} days).`);
  console.log("Charts with these points are labelled \"Demo data\" in the app. Remove them with --remove.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
}
