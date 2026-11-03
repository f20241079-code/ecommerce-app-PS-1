/**
 * Price vs time for a product, from the Supabase `price_history` table.
 *
 * Prices are a step function: a price holds until the next change. All
 * statistics here are computed that way (e.g. the average is weighted by how
 * long each price lasted), and charts should draw steps, not slopes.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PricePoint = {
  at: number; // ms since epoch
  price: number;
  originalPrice: number;
  simulated: boolean;
};

export type PriceRange = { key: string; label: string; days: number | null };

export const PRICE_RANGES: PriceRange[] = [
  { key: "1m", label: "1M", days: 30 },
  { key: "3m", label: "3M", days: 90 },
  { key: "6m", label: "6M", days: 180 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
];

const DAY = 24 * 60 * 60 * 1000;

export async function fetchPriceHistory(productId: string): Promise<PricePoint[]> {
  const { data, error } = await supabase
    .from("price_history")
    .select("price, original_price, source, recorded_at")
    .eq("product_id", productId)
    .order("recorded_at", { ascending: true })
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    at: Date.parse(r.recorded_at),
    price: Number(r.price),
    originalPrice: Number(r.original_price),
    simulated: r.source === "simulated",
  }));
}

export function usePriceHistory(productId: string | undefined) {
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(!!productId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setPoints([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPriceHistory(productId)
      .then((p) => {
        if (!cancelled) {
          setPoints(p);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  return { points, loading, error };
}

export type PriceSeries = {
  /** Step points inside the window, starting at the window start and ending "now". */
  points: { at: number; price: number }[];
  /** Real changes inside the window (for the table view), newest first. */
  changes: PricePoint[];
  start: number;
  end: number;
  min: number;
  max: number;
  average: number;
  current: number;
  minAt: number;
  simulated: boolean;
  /** Days actually covered by data inside this window. */
  coveredDays: number;
};

/**
 * Build the series for a time window. `currentPrice` is the product's live
 * price and extends the last step to `now`.
 */
export function buildSeries(
  history: PricePoint[],
  currentPrice: number,
  days: number | null,
  now = Date.now()
): PriceSeries | null {
  const sorted = [...history].filter((p) => Number.isFinite(p.at) && p.at <= now).sort((a, b) => a.at - b.at);
  if (sorted.length === 0) return null;

  const windowStart = days == null ? sorted[0].at : Math.max(now - days * DAY, sorted[0].at);
  // The price in force at the window start is the last change at or before it.
  let startPrice = sorted[0].price;
  for (const p of sorted) if (p.at <= windowStart) startPrice = p.price;

  const inside = sorted.filter((p) => p.at > windowStart);
  const points = [{ at: windowStart, price: startPrice }, ...inside.map((p) => ({ at: p.at, price: p.price }))];
  const last = points[points.length - 1];
  points.push({ at: now, price: Number.isFinite(currentPrice) ? currentPrice : last.price });

  let min = Infinity;
  let max = -Infinity;
  let minAt = windowStart;
  let weighted = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.price < min) {
      min = p.price;
      minAt = p.at;
    }
    max = Math.max(max, p.price);
    const next = points[i + 1];
    if (next) weighted += p.price * (next.at - p.at);
  }
  const span = now - windowStart;
  const average = span > 0 ? weighted / span : points[points.length - 1].price;

  const changesInWindow = sorted.filter((p) => p.at >= windowStart);
  return {
    points,
    changes: [...changesInWindow].reverse(),
    start: windowStart,
    end: now,
    min,
    max,
    average,
    current: points[points.length - 1].price,
    minAt,
    simulated: sorted.some((p) => p.simulated && p.at >= windowStart - DAY),
    coveredDays: Math.max(0, Math.round(span / DAY)),
  };
}

export type PriceVerdict = { tone: "good" | "neutral" | "high"; text: string };

/** A short, honest reading of the current price against the window. */
export function priceVerdict(s: PriceSeries, rangeLabel: string): PriceVerdict | null {
  if (s.max - s.min < 0.01) return null; // flat: nothing to say
  if (s.current <= s.min + 0.005) return { tone: "good", text: `Lowest price in ${rangeLabel}` };
  const aboveLow = ((s.current - s.min) / s.min) * 100;
  if (s.current >= s.max - 0.005) return { tone: "high", text: `Highest price in ${rangeLabel} (${aboveLow.toFixed(0)}% above the low)` };
  if (s.current < s.average) return { tone: "good", text: `Below the ${rangeLabel} average · ${aboveLow.toFixed(0)}% above the low` };
  return { tone: "neutral", text: `${aboveLow.toFixed(0)}% above the ${rangeLabel} low` };
}
