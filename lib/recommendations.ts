/**
 * Content-based product recommendations.
 *
 * Primary path (server-side ML):
 *   Each product in the Supabase `products` table carries a 384-dim text
 *   embedding produced by the `gte-small` sentence-embedding model (see
 *   supabase/functions/embed-products). Similar products are found with a
 *   pgvector cosine-distance search inside Postgres:
 *     - match_similar_products(p_product_id, match_count)
 *     - recommend_products(seed_ids, match_count)
 *
 * Fallback path (on-device):
 *   If the backend is not set up yet, has no embeddings, or the device is
 *   offline, the same idea runs locally with TF-IDF vectors over the catalog
 *   text plus cosine similarity. The app always shows sensible results.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PRODUCTS, getProductById, productText, type Product } from "@/lib/products";

export type RecommendationSource = "ml" | "local";

export type RecommendationResult = {
  items: Product[];
  source: RecommendationSource;
};

// ---------------------------------------------------------------------------
// Remote (pgvector) path
// ---------------------------------------------------------------------------

type ProductRow = {
  id: string;
  name: string;
  price: number;
  original_price: number;
  rating: number;
  reviews: number;
  icon: string;
  category: string;
  badge: string | null;
  description: string;
  tags: string[] | null;
  similarity: number;
};

const fromRow = (r: ProductRow): Product => ({
  id: r.id,
  name: r.name,
  price: Number(r.price),
  originalPrice: Number(r.original_price),
  rating: Number(r.rating),
  reviews: r.reviews,
  icon: r.icon,
  category: r.category,
  badge: r.badge ?? "",
  description: r.description,
  tags: r.tags ?? [],
});

// Once the backend fails (e.g. migration not applied), stop retrying for this
// app session so every screen doesn't pay for a failing network round-trip.
let remoteUnavailable = false;

async function callRemote(fn: string, args: Record<string, unknown>): Promise<Product[] | null> {
  if (remoteUnavailable) return null;
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      remoteUnavailable = true;
      return null;
    }
    const rows = (data ?? []) as ProductRow[];
    // An empty result usually means embeddings haven't been generated yet.
    return rows.length > 0 ? rows.map(fromRow) : null;
  } catch {
    remoteUnavailable = true;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Local (TF-IDF) fallback
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "at", "by", "for", "from", "in", "is", "it", "of", "on",
  "or", "the", "to", "with", "your", "you", "up", "more", "all", "into", "that", "this",
  "category", "tags",
]);

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

type SparseVec = Map<string, number>;

function buildIndex(products: Product[]) {
  const docs = products.map((p) => {
    // Repeat name, category and tags so they weigh more than the free text.
    const tokens = [
      ...tokenize(productText(p)),
      ...tokenize(p.name),
      ...tokenize(p.category),
      ...tokenize(p.category),
      ...p.tags.flatMap(tokenize),
    ];
    const tf: SparseVec = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return tf;
  });

  const df = new Map<string, number>();
  for (const tf of docs) for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);

  const n = products.length;
  const vectors = new Map<string, SparseVec>();
  docs.forEach((tf, i) => {
    const vec: SparseVec = new Map();
    let norm = 0;
    for (const [t, count] of tf) {
      const w = (1 + Math.log(count)) * Math.log((1 + n) / (1 + (df.get(t) ?? 0)) + 1);
      vec.set(t, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [t, w] of vec) vec.set(t, w / norm);
    vectors.set(products[i].id, vec);
  });
  return vectors;
}

let localIndex: Map<string, SparseVec> | null = null;
const getIndex = () => (localIndex ??= buildIndex(PRODUCTS));

const dot = (a: SparseVec, b: SparseVec) => {
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  let s = 0;
  for (const [t, w] of small) s += w * (big.get(t) ?? 0);
  return s;
};

/** Small bonus for products in a similar price band (log scale). */
const priceAffinity = (a: number, b: number) =>
  1 / (1 + Math.abs(Math.log((a + 1) / (b + 1))));

function rankLocal(query: SparseVec, refPrice: number, exclude: Set<string>, k: number): Product[] {
  const index = getIndex();
  return PRODUCTS.filter((p) => !exclude.has(p.id))
    .map((p) => ({
      p,
      score: 0.9 * dot(query, index.get(p.id)!) + 0.1 * priceAffinity(refPrice, p.price),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.p);
}

export function localSimilarProducts(productId: string, k = 6): Product[] {
  const product = getProductById(productId);
  if (!product) return popularProducts(k);
  return rankLocal(getIndex().get(productId)!, product.price, new Set([productId]), k);
}

export function localRecommendations(seedIds: string[], k = 6): Product[] {
  const index = getIndex();
  const seeds = seedIds.filter((id) => index.has(id));
  if (seeds.length === 0) return popularProducts(k);

  // User profile = mean of the seed product vectors.
  const profile: SparseVec = new Map();
  for (const id of seeds) {
    for (const [t, w] of index.get(id)!) profile.set(t, (profile.get(t) ?? 0) + w / seeds.length);
  }
  const avgPrice = seeds.reduce((s, id) => s + getProductById(id)!.price, 0) / seeds.length;
  return rankLocal(profile, avgPrice, new Set(seeds), k);
}

/**
 * Cold-start ranking: popularity (rating weighted by review volume), picking
 * the best product of each category in turn so one category can't dominate.
 */
export function popularProducts(k = 6, exclude: Set<string> = new Set()): Product[] {
  const ranked = PRODUCTS.filter((p) => !exclude.has(p.id))
    .map((p) => ({ p, score: p.rating * Math.log10(10 + p.reviews) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);

  const picked: Product[] = [];
  const used = new Set<string>();
  while (picked.length < Math.min(k, ranked.length)) {
    const seen = new Set<string>();
    for (const p of ranked) {
      if (picked.length >= k) break;
      if (used.has(p.id) || seen.has(p.category)) continue;
      seen.add(p.category);
      used.add(p.id);
      picked.push(p);
    }
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getSimilarProducts(productId: string, k = 6): Promise<RecommendationResult> {
  const remote = await callRemote("match_similar_products", { p_product_id: productId, match_count: k });
  if (remote) return { items: remote, source: "ml" };
  return { items: localSimilarProducts(productId, k), source: "local" };
}

export async function getRecommendations(seedIds: string[], k = 6): Promise<RecommendationResult> {
  if (seedIds.length > 0) {
    const remote = await callRemote("recommend_products", { seed_ids: seedIds, match_count: k });
    if (remote) return { items: remote, source: "ml" };
  }
  return { items: localRecommendations(seedIds, k), source: "local" };
}

/** React hook: products similar to the one being viewed. */
export function useSimilarProducts(productId: string | undefined, k = 6) {
  const [result, setResult] = useState<RecommendationResult | null>(null);

  useEffect(() => {
    if (!productId) {
      setResult({ items: popularProducts(k), source: "local" });
      return;
    }
    let cancelled = false;
    // Show instant local results, then upgrade to the ML results when they arrive.
    setResult({ items: localSimilarProducts(productId, k), source: "local" });
    getSimilarProducts(productId, k).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [productId, k]);

  return result;
}

/** React hook: personalised picks based on the user's cart and wishlist. */
export function useRecommendations(seedIds: string[], k = 6) {
  // Stable key so a new array with the same ids doesn't refetch.
  const key = useMemo(() => [...new Set(seedIds)].sort().join(","), [seedIds]);
  const [result, setResult] = useState<RecommendationResult | null>(null);

  useEffect(() => {
    const seeds = key ? key.split(",") : [];
    let cancelled = false;
    setResult({ items: localRecommendations(seeds, k), source: "local" });
    getRecommendations(seeds, k).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [key, k]);

  return result;
}
