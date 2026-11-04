/**
 * Live product data from Supabase.
 *
 * The whole catalog (a few hundred rows) is loaded once per app session and
 * shared by every screen through useCatalog(). If the backend can't be
 * reached or the table is empty, the bundled fallback catalog from
 * lib/products.ts is used so the app still works.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  PRODUCTS,
  categoryLabel,
  getCatalog,
  setCatalog,
  type Product,
} from "@/lib/products";

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

export type ProductRow = {
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
  brand?: string | null;
  images?: string[] | null;
  thumbnail?: string | null;
  stock?: number | null;
  availability_status?: string | null;
  warranty?: string | null;
  shipping?: string | null;
  return_policy?: string | null;
  weight?: number | null;
  dimensions?: Product["dimensions"] | null;
  specs?: Product["specs"] | null;
  similarity?: number;
};

export const fromRow = (r: ProductRow): Product => ({
  id: String(r.id),
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
  brand: r.brand ?? undefined,
  images: r.images ?? undefined,
  thumbnail: r.thumbnail ?? undefined,
  stock: r.stock ?? undefined,
  availabilityStatus: r.availability_status ?? undefined,
  warranty: r.warranty ?? undefined,
  shipping: r.shipping ?? undefined,
  returnPolicy: r.return_policy ?? undefined,
  weight: r.weight != null ? Number(r.weight) : undefined,
  dimensions: r.dimensions ?? undefined,
  specs: r.specs && typeof r.specs === "object" ? r.specs : undefined,
});

// Never select the embedding column: it's large and the app doesn't need it.
const BASE_COLUMNS =
  "id, name, price, original_price, rating, reviews, icon, category, badge, description, tags, " +
  "brand, images, thumbnail, stock, availability_status, warranty, shipping, return_policy";
// Added by the price-history/specs migration. If that migration hasn't been
// applied yet, the catalog is loaded without them instead of failing.
const PRODUCT_COLUMNS = BASE_COLUMNS + ", weight, dimensions, specs";

const byNumericId = (a: Product, b: Product) => {
  const na = Number(a.id);
  const nb = Number(b.id);
  return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.id.localeCompare(b.id);
};

// ---------------------------------------------------------------------------
// Catalog store (module-level, shared by all hooks)
// ---------------------------------------------------------------------------

export type CatalogSource = "live" | "offline";

type CatalogState = {
  products: Product[];
  source: CatalogSource;
  loading: boolean;
  error: string | null;
  version: number;
};

let state: CatalogState = {
  products: PRODUCTS,
  source: "offline",
  loading: true,
  error: null,
  version: 0,
};
let inflight: Promise<void> | null = null;
const listeners = new Set<(s: CatalogState) => void>();

const update = (patch: Partial<CatalogState>) => {
  state = { ...state, ...patch, version: state.version + 1 };
  listeners.forEach((l) => l(state));
};

async function fetchCatalog() {
  update({ loading: true, error: null });
  try {
    let { data, error } = await supabase.from("products").select(PRODUCT_COLUMNS);
    if (error && (error.code === "42703" || /column .* does not exist/i.test(error.message))) {
      ({ data, error } = await supabase.from("products").select(BASE_COLUMNS));
    }
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as ProductRow[];
    if (rows.length === 0) {
      // Table exists but hasn't been imported yet.
      update({ loading: false, source: "offline", products: PRODUCTS });
      return;
    }
    const products = rows.map(fromRow).sort(byNumericId);
    setCatalog(products);
    update({ loading: false, source: "live", products });
  } catch (e) {
    update({
      loading: false,
      source: "offline",
      products: getCatalog(),
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Load (or reload) the catalog. Concurrent callers share one request. */
export function loadCatalog(force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && state.source === "live") return Promise.resolve();
  inflight = fetchCatalog().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** All products plus loading/source info. Triggers the first load. */
export function useCatalog() {
  const [snapshot, setSnapshot] = useState(state);

  useEffect(() => {
    listeners.add(setSnapshot);
    setSnapshot(state);
    loadCatalog();
    return () => {
      listeners.delete(setSnapshot);
    };
  }, []);

  return {
    products: snapshot.products,
    source: snapshot.source,
    loading: snapshot.loading && snapshot.source !== "live",
    error: snapshot.error,
    version: snapshot.version,
    refresh: () => loadCatalog(true),
  };
}

export function useProduct(id: string | undefined) {
  const { products, loading } = useCatalog();
  const product = useMemo(() => (id ? products.find((p) => p.id === id) : undefined), [products, id]);
  return { product, loading };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type Category = {
  slug: string;
  name: string;
  icon: string;
  color: string;
  count: number;
};

const CATEGORY_ICONS: Record<string, string> = {
  beauty: "💄", fragrances: "🌸", furniture: "🛋️", groceries: "🛒",
  "home-decoration": "🏠", "kitchen-accessories": "🍳", laptops: "💻",
  "mens-shirts": "👔", "mens-shoes": "👞", "mens-watches": "⌚",
  "mobile-accessories": "🔌", motorcycle: "🏍️", "skin-care": "🧴",
  smartphones: "📱", "sports-accessories": "⚽", sunglasses: "🕶️",
  tablets: "📲", tops: "👚", vehicle: "🚗", "womens-bags": "👜",
  "womens-dresses": "👗", "womens-jewellery": "💍", "womens-shoes": "👠",
  "womens-watches": "⌚",
  // bundled fallback catalog
  electronics: "📱", fashion: "👗", sports: "⚽", books: "📚", gaming: "🎮",
  travel: "🧳", office: "💼", home: "🏠",
};

const CATEGORY_COLORS = ["#6C63FF", "#FF6584", "#43E97B", "#FFB800", "#4ECDC4"];

export const categoryIcon = (slug: string) => CATEGORY_ICONS[slug.toLowerCase()] ?? "🛍️";

export function useCategories() {
  const { products, loading, source } = useCatalog();
  const categories = useMemo<Category[]>(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([slug, count], i) => ({
        slug,
        name: categoryLabel(slug),
        icon: categoryIcon(slug),
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        count,
      }));
  }, [products]);
  return { categories, loading, source };
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export type Review = {
  id: number;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
};

export function useProductReviews(productId: string | undefined) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("product_reviews")
      .select("id, rating, comment, reviewer_name, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error || !data) {
          setReviews([]);
          return;
        }
        setReviews(
          data.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            reviewerName: r.reviewer_name,
            createdAt: r.created_at,
          }))
        );
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  return { reviews, loading };
}

// ---------------------------------------------------------------------------
// Helpers shared by screens
// ---------------------------------------------------------------------------

/** Navigation params for the product detail screen. */
export const productParams = (p: Product) => ({
  id: p.id,
  name: p.name,
  price: String(p.price),
  originalPrice: String(p.originalPrice),
  rating: String(p.rating),
  icon: p.icon,
});

export const discountPercent = (p: Pick<Product, "price" | "originalPrice">) =>
  p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;

/** Simple client-side search over name, brand, category and tags. */
export function matchesQuery(p: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [p.name, p.brand ?? "", p.category, categoryLabel(p.category), ...p.tags]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

/** 40 -> "40", 47.5 -> "47.50" */
export const formatPrice = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** Slug used by the "Featured → See All" screen. */
export const FEATURED_SLUG = "featured";

/** Featured = discounted products, best rated first (then biggest discount). */
export function featuredDeals(products: Product[]): Product[] {
  return products
    .filter((p) => discountPercent(p) > 0)
    .sort((a, b) => b.rating - a.rating || discountPercent(b) - discountPercent(a));
}
