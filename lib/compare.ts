/**
 * Spec comparison for electronics in a similar price range.
 */
import { categoryLabel, type Product } from "@/lib/products";

/** Categories treated as electronics (DummyJSON slugs + bundled catalog names). */
export const ELECTRONICS_CATEGORIES = new Set([
  "smartphones",
  "laptops",
  "tablets",
  "mobile-accessories",
  "electronics",
  "gaming",
]);

export const isElectronics = (p: Pick<Product, "category">) =>
  ELECTRONICS_CATEGORIES.has(p.category.toLowerCase());

/** Default price band: ±25% of the product's price. */
export const PRICE_BAND = 0.25;
export const MAX_COMPARE = 4;

export function priceBand(price: number, band = PRICE_BAND) {
  return { min: price * (1 - band), max: price * (1 + band) };
}

/**
 * Electronics within the price band, same category first, then closest price.
 * Widens to ±40% when fewer than two matches are found.
 */
export function findComparable(base: Product, catalog: Product[], limit = MAX_COMPARE - 1) {
  const pick = (band: number) => {
    const { min, max } = priceBand(base.price, band);
    return catalog
      .filter((p) => p.id !== base.id && isElectronics(p) && p.price >= min && p.price <= max)
      .sort(
        (a, b) =>
          Number(b.category === base.category) - Number(a.category === base.category) ||
          Math.abs(a.price - base.price) - Math.abs(b.price - base.price)
      );
  };
  let band = PRICE_BAND;
  let matches = pick(band);
  if (matches.length < 2) {
    band = 0.4;
    matches = pick(band);
  }
  return { products: matches.slice(0, limit), total: matches.length, band, ...priceBand(base.price, band) };
}

// ---------------------------------------------------------------------------
// Spec rows
// ---------------------------------------------------------------------------

export type SpecRow = {
  key: string;
  label: string;
  values: string[];
  /** Index of the best value, if this row has a clear "better" direction. */
  best: number | null;
  /** Explains what "best" means for this row. */
  bestHint?: string;
};

const fmtMoney = (n: number) => `$${n.toFixed(2)}`;

/** "1 year warranty" -> 12, "6 months warranty" -> 6, "Lifetime warranty" -> 1200. */
export function warrantyMonths(text?: string): number | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes("lifetime")) return 1200;
  if (t.includes("no warranty")) return 0;
  const m = t.match(/(\d+(?:\.\d+)?)\s*(year|month|week|day)/);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "year" ? n * 12 : m[2] === "month" ? n : m[2] === "week" ? n / 4.345 : n / 30;
}

function bestIndex(nums: (number | null)[], direction: "max" | "min"): number | null {
  const valid = nums.map((n, i) => ({ n, i })).filter((x) => x.n != null) as { n: number; i: number }[];
  if (valid.length < 2) return null;
  const target = direction === "max" ? Math.max(...valid.map((x) => x.n)) : Math.min(...valid.map((x) => x.n));
  const winners = valid.filter((x) => Math.abs(x.n - target) < 1e-9);
  return winners.length === 1 ? winners[0].i : null; // ties have no single "best"
}

const discountPct = (p: Product) =>
  p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;

const dims = (p: Product) => {
  const d = p.dimensions;
  if (!d || (!d.width && !d.height && !d.depth)) return null;
  return [d.width, d.height, d.depth].map((v) => (v == null ? "?" : v.toFixed(1))).join(" × ");
};

export function buildSpecRows(products: Product[]): SpecRow[] {
  const rows: SpecRow[] = [];
  const add = (
    key: string,
    label: string,
    get: (p: Product) => string | null | undefined,
    numeric?: { get: (p: Product) => number | null; direction: "max" | "min"; hint: string }
  ) => {
    const values = products.map((p) => get(p) ?? "—");
    if (values.every((v) => v === "—")) return; // nobody has this spec
    const best = numeric ? bestIndex(products.map(numeric.get), numeric.direction) : null;
    rows.push({ key, label, values, best, bestHint: numeric?.hint });
  };

  add("price", "Price", (p) => fmtMoney(p.price), { get: (p) => p.price, direction: "min", hint: "lowest" });
  add("discount", "Discount", (p) => (discountPct(p) ? `${discountPct(p)}% off ${fmtMoney(p.originalPrice)}` : "None"), {
    get: (p) => discountPct(p),
    direction: "max",
    hint: "biggest",
  });
  add("rating", "Rating", (p) => `⭐ ${p.rating.toFixed(1)}`, { get: (p) => p.rating, direction: "max", hint: "highest" });
  add("reviews", "Reviews", (p) => String(p.reviews));
  add("brand", "Brand", (p) => p.brand);
  add("category", "Category", (p) => categoryLabel(p.category));
  add("stock", "Availability", (p) =>
    p.stock == null ? p.availabilityStatus : p.stock === 0 ? "Out of stock" : p.stock < 10 ? `Only ${p.stock} left` : "In stock"
  );
  add("warranty", "Warranty", (p) => p.warranty, {
    get: (p) => warrantyMonths(p.warranty),
    direction: "max",
    hint: "longest",
  });
  add("weight", "Weight", (p) => (p.weight != null ? String(p.weight) : null), {
    get: (p) => p.weight ?? null,
    direction: "min",
    hint: "lightest",
  });
  add("dimensions", "Size (W × H × D)", dims);
  add("shipping", "Shipping", (p) => p.shipping);
  add("returns", "Returns", (p) => p.returnPolicy);

  // Free-form specs added in Supabase (e.g. RAM, Storage, Screen): union of keys.
  const specKeys: string[] = [];
  for (const p of products) for (const k of Object.keys(p.specs ?? {})) if (!specKeys.includes(k)) specKeys.push(k);
  for (const k of specKeys) {
    add(`spec:${k}`, k, (p) => {
      const v = p.specs?.[k];
      return v == null || v === "" ? null : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v);
    });
  }
  return rows;
}
