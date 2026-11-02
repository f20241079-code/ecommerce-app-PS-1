/**
 * Product model + bundled fallback catalog.
 *
 * The live catalog comes from the Supabase `products` table (filled by
 * scripts/import-products.mjs) and is loaded by lib/productsApi.ts, which
 * calls setCatalog(). PRODUCTS below is only used when the backend can't be
 * reached (offline / not set up yet), and by scripts/generate-product-seed.mjs.
 *
 * `description` and `tags` exist mainly to give the ML model rich text to
 * learn from: the embedding of a product is computed from
 * name + category + description + tags (see productText()).
 */

export type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  icon: string;
  category: string;
  badge: string;
  description: string;
  tags: string[];
  // Present for products imported from the real catalog.
  brand?: string;
  images?: string[];
  thumbnail?: string;
  stock?: number;
  availabilityStatus?: string;
  warranty?: string;
  shipping?: string;
  returnPolicy?: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "1", name: "iPhone 15 Pro", price: 999, originalPrice: 1199, rating: 4.8, reviews: 2341, icon: "📱", category: "Electronics", badge: "Best Seller",
    description: "The most powerful iPhone ever with A17 Pro chip, titanium design, and advanced camera system with 5x optical zoom. Features USB-C connectivity and Action Button.",
    tags: ["apple", "smartphone", "phone", "mobile", "camera", "ios"],
  },
  {
    id: "2", name: "Nike Air Max 270", price: 129, originalPrice: 180, rating: 4.5, reviews: 1876, icon: "👟", category: "Fashion", badge: "Popular",
    description: "Experience ultimate comfort with Nike's largest heel Air unit yet. Breathable mesh upper with foam midsole for all-day wear and style.",
    tags: ["nike", "shoes", "sneakers", "footwear", "casual", "running"],
  },
  {
    id: "3", name: "MacBook Pro 16\"", price: 1999, originalPrice: 2499, rating: 4.9, reviews: 987, icon: "💻", category: "Electronics", badge: "Top Rated",
    description: "Supercharged by M3 Pro chip. Up to 22 hours battery life. Liquid Retina XDR display with ProMotion technology. Perfect for professionals.",
    tags: ["apple", "laptop", "computer", "macos", "work", "productivity"],
  },
  {
    id: "4", name: "Sony WH-1000XM5", price: 299, originalPrice: 399, rating: 4.7, reviews: 3210, icon: "🎧", category: "Electronics", badge: "New",
    description: "Industry-leading noise canceling with auto NC optimizer. 30-hour battery life with quick charge. Crystal clear hands-free calling.",
    tags: ["sony", "headphones", "audio", "wireless", "bluetooth", "noise cancelling", "music", "travel"],
  },
  {
    id: "5", name: "Samsung 65\" TV", price: 799, originalPrice: 1199, rating: 4.6, reviews: 654, icon: "📺", category: "Electronics", badge: "Sale",
    description: "Quantum HDR 32x, Real Game Enhancer+. Stunning 4K picture quality with Neural Quantum Processor. Smart TV with built-in streaming.",
    tags: ["samsung", "television", "tv", "4k", "home entertainment", "streaming", "gaming"],
  },
  {
    id: "6", name: "Adidas Ultraboost", price: 189, originalPrice: 220, rating: 4.4, reviews: 2103, icon: "👟", category: "Fashion", badge: "Popular",
    description: "Responsive Boost cushioning and a Primeknit upper that adapts to your foot. Built for running and styled for the street.",
    tags: ["adidas", "shoes", "sneakers", "footwear", "running"],
  },
  {
    id: "7", name: "Nespresso Machine", price: 79, originalPrice: 99, rating: 4.3, reviews: 876, icon: "☕", category: "Home", badge: "Sale",
    description: "Barista-quality espresso and coffee at the touch of a button. Compact design, fast heat-up and recyclable capsules.",
    tags: ["coffee", "espresso", "kitchen", "appliance", "home"],
  },
  {
    id: "8", name: "Lululemon Yoga Mat", price: 88, originalPrice: 98, rating: 4.6, reviews: 1432, icon: "🧘", category: "Sports", badge: "Best Seller",
    description: "Grippy natural rubber yoga mat with a polyurethane top layer that absorbs sweat. Great cushioning for yoga, pilates and home workouts.",
    tags: ["yoga", "fitness", "workout", "exercise", "mat", "pilates"],
  },
  {
    id: "9", name: "Atomic Habits", price: 18, originalPrice: 25, rating: 4.9, reviews: 45231, icon: "📖", category: "Books", badge: "Best Seller",
    description: "James Clear's bestselling guide to building good habits and breaking bad ones with tiny changes that deliver remarkable results.",
    tags: ["book", "self help", "habits", "productivity", "nonfiction"],
  },
  {
    id: "10", name: "Charlotte Tilbury", price: 65, originalPrice: 75, rating: 4.7, reviews: 3421, icon: "💄", category: "Beauty", badge: "New",
    description: "Iconic Pillow Talk makeup set with long-lasting matte lipstick and lip liner for a flattering nude-pink look.",
    tags: ["makeup", "lipstick", "cosmetics", "beauty", "lips"],
  },
  {
    id: "11", name: "iPad Pro 12.9\"", price: 1099, originalPrice: 1199, rating: 4.8, reviews: 1654, icon: "📱", category: "Electronics", badge: "New",
    description: "Apple M2 chip, Liquid Retina XDR display and Apple Pencil support. A powerful tablet for creativity, notes and entertainment.",
    tags: ["apple", "tablet", "ipad", "drawing", "productivity", "ios"],
  },
  {
    id: "12", name: "Levi's 501 Jeans", price: 69, originalPrice: 89, rating: 4.4, reviews: 8765, icon: "👖", category: "Fashion", badge: "Classic",
    description: "The original straight-fit button-fly jeans in durable denim. A timeless wardrobe staple.",
    tags: ["levis", "jeans", "denim", "clothing", "pants", "casual"],
  },
  {
    id: "13", name: "Nintendo Switch", price: 349, originalPrice: 399, rating: 4.8, reviews: 5432, icon: "🎮", category: "Gaming", badge: "Popular",
    description: "Hybrid gaming console you can play on the TV or on the go. Detachable Joy-Con controllers for multiplayer fun.",
    tags: ["nintendo", "console", "video games", "gaming", "portable"],
  },
  {
    id: "14", name: "Gaming Headset", price: 89, originalPrice: 120, rating: 4.6, reviews: 2341, icon: "🎧", category: "Gaming", badge: "New",
    description: "Surround sound gaming headset with noise-cancelling boom microphone and memory foam ear cushions for long sessions.",
    tags: ["headphones", "headset", "audio", "microphone", "gaming", "pc", "console"],
  },
  {
    id: "15", name: "Carry-On Luggage", price: 129, originalPrice: 180, rating: 4.5, reviews: 1234, icon: "🧳", category: "Travel", badge: "Popular",
    description: "Lightweight hard-shell carry-on suitcase with 360° spinner wheels, TSA lock and expandable packing space.",
    tags: ["luggage", "suitcase", "travel", "bag", "airport", "trip"],
  },
  {
    id: "16", name: "Travel Pillow", price: 27, originalPrice: 35, rating: 4.4, reviews: 876, icon: "🛏️", category: "Travel", badge: "Sale",
    description: "Memory foam neck pillow that supports your head on flights, trains and road trips. Packs down small.",
    tags: ["pillow", "travel", "flight", "comfort", "sleep", "trip"],
  },
  {
    id: "17", name: "Ergonomic Mouse", price: 59, originalPrice: 79, rating: 4.6, reviews: 1543, icon: "🖱️", category: "Office", badge: "Popular",
    description: "Vertical ergonomic wireless mouse that reduces wrist strain. Comfortable for long days at the desk.",
    tags: ["mouse", "computer", "accessory", "wireless", "desk", "ergonomic", "work"],
  },
  {
    id: "18", name: "Standing Desk", price: 249, originalPrice: 349, rating: 4.7, reviews: 987, icon: "🖥️", category: "Office", badge: "Top Rated",
    description: "Electric height-adjustable sit-stand desk with memory presets. Healthier posture and less back pain while you work.",
    tags: ["desk", "furniture", "ergonomic", "work", "home office", "productivity"],
  },
  {
    id: "19", name: "AirPods Pro", price: 199, originalPrice: 249, rating: 4.8, reviews: 9876, icon: "🎧", category: "Electronics", badge: "Best Seller",
    description: "Apple wireless earbuds with active noise cancellation, transparency mode and spatial audio.",
    tags: ["apple", "earbuds", "headphones", "audio", "wireless", "bluetooth", "music", "noise cancelling"],
  },
  {
    id: "20", name: "Apple Watch S9", price: 399, originalPrice: 499, rating: 4.7, reviews: 4321, icon: "⌚", category: "Electronics", badge: "New",
    description: "Smartwatch with fitness and health tracking, heart rate, workouts, notifications and an always-on display.",
    tags: ["apple", "smartwatch", "watch", "fitness", "health", "wearable", "ios"],
  },
  {
    id: "21", name: "PS5 Controller", price: 69, originalPrice: 79, rating: 4.8, reviews: 6543, icon: "🎮", category: "Gaming", badge: "Popular",
    description: "PlayStation DualSense wireless controller with haptic feedback and adaptive triggers.",
    tags: ["playstation", "sony", "controller", "gamepad", "console", "video games", "gaming"],
  },
  {
    id: "22", name: "Kindle Paperwhite", price: 139, originalPrice: 179, rating: 4.7, reviews: 12345, icon: "📱", category: "Electronics", badge: "Best Seller",
    description: "Waterproof e-reader with a glare-free display and weeks of battery life. Carry thousands of books anywhere.",
    tags: ["kindle", "ereader", "reading", "books", "travel"],
  },
  {
    id: "23", name: "Zara Dress", price: 49, originalPrice: 69, rating: 4.3, reviews: 3456, icon: "👗", category: "Fashion", badge: "Sale",
    description: "Flowing midi dress in a light fabric, perfect for summer days and evenings out.",
    tags: ["zara", "dress", "clothing", "women", "summer"],
  },
  {
    id: "24", name: "H&M Jacket", price: 39, originalPrice: 59, rating: 4.2, reviews: 2345, icon: "🧥", category: "Fashion", badge: "Sale",
    description: "Lightweight everyday jacket with a water-repellent finish. Easy to layer for autumn and spring.",
    tags: ["jacket", "outerwear", "clothing", "casual"],
  },
  {
    id: "25", name: "The Psychology of Money", price: 15, originalPrice: 20, rating: 4.8, reviews: 23456, icon: "📚", category: "Books", badge: "Best Seller",
    description: "Morgan Housel's timeless lessons on wealth, greed and happiness, and how behaviour shapes financial decisions.",
    tags: ["book", "finance", "money", "self help", "nonfiction"],
  },
  {
    id: "26", name: "Deep Work", price: 14, originalPrice: 18, rating: 4.7, reviews: 15678, icon: "📖", category: "Books", badge: "Popular",
    description: "Cal Newport's rules for focused success in a distracted world. Learn to concentrate and get more meaningful work done.",
    tags: ["book", "productivity", "focus", "work", "self help", "nonfiction"],
  },
  {
    id: "27", name: "MAC Lipstick", price: 19, originalPrice: 24, rating: 4.5, reviews: 5432, icon: "💋", category: "Beauty", badge: "Popular",
    description: "Creamy, highly pigmented lipstick in a range of bold shades with a long-wearing finish.",
    tags: ["makeup", "lipstick", "cosmetics", "beauty", "lips"],
  },
  {
    id: "28", name: "Vitamin C Serum", price: 29, originalPrice: 39, rating: 4.6, reviews: 8765, icon: "🧴", category: "Beauty", badge: "New",
    description: "Brightening face serum with vitamin C and hyaluronic acid for glowing, hydrated skin.",
    tags: ["skincare", "serum", "face", "beauty", "glow"],
  },
  {
    id: "29", name: "Wilson Tennis Racket", price: 199, originalPrice: 249, rating: 4.6, reviews: 765, icon: "🎾", category: "Sports", badge: "Pro",
    description: "Lightweight graphite tennis racket with a large sweet spot for power and control.",
    tags: ["tennis", "racket", "sports", "outdoor", "fitness"],
  },
  {
    id: "30", name: "Running Shoes", price: 119, originalPrice: 149, rating: 4.5, reviews: 3456, icon: "👟", category: "Sports", badge: "Popular",
    description: "Cushioned, breathable running shoes with a responsive midsole for road runs and gym workouts.",
    tags: ["shoes", "sneakers", "footwear", "running", "fitness", "workout"],
  },
];

// ---------------------------------------------------------------------------
// Current catalog (bundled fallback until lib/productsApi.ts loads real data)
// ---------------------------------------------------------------------------

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

let catalog: Product[] = PRODUCTS;
let catalogVersion = 0;
let byId = new Map<string, Product>();
let byName = new Map<string, Product>();

function indexCatalog() {
  byId = new Map(catalog.map((p) => [p.id, p]));
  byName = new Map(catalog.map((p) => [normalize(p.name), p]));
}
indexCatalog();

export function setCatalog(products: Product[]) {
  if (products.length === 0) return;
  catalog = products;
  catalogVersion++;
  indexCatalog();
}

export const getCatalog = () => catalog;
/** Increments every time the catalog is replaced (used to invalidate caches). */
export const getCatalogVersion = () => catalogVersion;

/**
 * Resolve a product from navigation params / cart items. The id is tried
 * first; the name is used for items saved before the catalog changed.
 */
export function findProduct(id?: string, name?: string): Product | undefined {
  if (name) {
    const p = id ? byId.get(id) : undefined;
    if (p && normalize(p.name) === normalize(name)) return p;
    const key = normalize(name);
    const exact = byName.get(key);
    if (exact) return exact;
    // e.g. "Nike Air Max" -> "Nike Air Max 270"
    const partial = catalog.find((c) => normalize(c.name).startsWith(key + " "));
    if (partial) return partial;
    return undefined;
  }
  return id ? byId.get(id) : undefined;
}

export function getProductById(id: string): Product | undefined {
  return byId.get(id);
}

/** "mens-shirts" -> "Mens Shirts" */
export function categoryLabel(category: string): string {
  return category
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** Text the ML model embeds for a product. Keep in sync with the edge function. */
export function productText(
  p: Pick<Product, "name" | "category" | "description" | "tags"> & { brand?: string | null }
): string {
  const brand = p.brand ? ` Brand: ${p.brand}.` : "";
  return `${p.name}. Category: ${categoryLabel(p.category)}.${brand} ${p.description} Tags: ${p.tags.join(", ")}.`;
}
