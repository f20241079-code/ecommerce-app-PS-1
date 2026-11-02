import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import ProductImage from "@/components/ProductImage";
import { categoryLabel, type Product } from "@/lib/products";
import { matchesQuery, productParams, useCatalog, useCategories, formatPrice } from "@/lib/productsApi";
import {
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const priceRanges = [
  { label: "Under $50", min: 0, max: 50 },
  { label: "$50 - $150", min: 50, max: 150 },
  { label: "$150 - $300", min: 150, max: 300 },
  { label: "$300+", min: 300, max: Infinity },
];

type PriceRange = (typeof priceRanges)[number];

const MAX_RECENT = 5;
// Browsers draw a focus ring around inputs; the container already shows focus.
const webNoOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null;
const MAX_QUICK_TAGS = 10;

export default function Search() {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<PriceRange | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { products: allProducts } = useCatalog();
  const { categories } = useCategories();

  // Quick tags = biggest categories; trending = best-rated products.
  const quickTags = useMemo(() => categories.slice(0, MAX_QUICK_TAGS).map((c) => c.name), [categories]);
  const trendingSearches = useMemo(
    () =>
      [...allProducts]
        .sort((a, b) => b.rating * Math.log10(10 + b.reviews) - a.rating * Math.log10(10 + a.reviews))
        .slice(0, 5)
        .map((p) => p.name),
    [allProducts]
  );

  const commitSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const deduped = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...deduped].slice(0, MAX_RECENT);
    });
  };

  const runSearch = (term: string) => {
    setQuery(term);
    commitSearch(term);
  };

  const filtered = allProducts.filter((p: Product) => {
    const matchesPrice = priceRange ? p.price >= priceRange.min && p.price <= priceRange.max : true;
    return matchesPrice && matchesQuery(p, query);
  });

  const showBrowseState = query.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Search 🔍</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }, webNoOutline]}
            placeholder="Search products or categories..."
            placeholderTextColor={colors.subtext}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => commitSearch(query)}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Text style={[styles.clearBtn, { color: colors.subtext }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterToggle,
            {
              backgroundColor: showFilters || priceRange ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Text style={{ fontSize: 18 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={[styles.sectionLabel, { color: colors.subtext }]}>Price Range</Text>
          <View style={styles.tagRow}>
            {priceRanges.map((range) => {
              const isActive = priceRange?.label === range.label;
              return (
                <TouchableOpacity
                  key={range.label}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.card,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setPriceRange(isActive ? null : range)}
                >
                  <Text style={[styles.tagText, { color: isActive ? colors.white : colors.text }]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.tagRow}>
        {quickTags.map((tag) => {
          const isActive = query.toLowerCase() === tag.toLowerCase();
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.tagButton, { backgroundColor: isActive ? colors.primary : colors.card, borderColor: colors.border }]}
              onPress={() => runSearch(tag)}
            >
              <Text style={[styles.tagText, { color: isActive ? colors.white : colors.text }]}>{tag}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showBrowseState ? (
        <FlatList
          data={[{ key: "browse" }]}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          renderItem={() => (
            <View>
              {recentSearches.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>🕓 Recent Searches</Text>
                    <TouchableOpacity onPress={() => setRecentSearches([])}>
                      <Text style={[styles.clearAllText, { color: colors.primary }]}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tagRow}>
                    {recentSearches.map((term) => (
                      <TouchableOpacity
                        key={term}
                        style={[styles.recentChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => runSearch(term)}
                      >
                        <Text style={[styles.tagText, { color: colors.text }]}>{term}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>🔥 Trending Searches</Text>
                <View style={styles.tagRow}>
                  {trendingSearches.map((term, index) => (
                    <TouchableOpacity
                      key={term}
                      style={[styles.trendingChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => runSearch(term)}
                    >
                      <Text style={[styles.trendingRank, { color: colors.primary }]}>{index + 1}</Text>
                      <Text style={[styles.tagText, { color: colors.text }]}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>😕</Text>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>No products found for "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                commitSearch(query);
                router.push({ pathname: "/(stack)/product-detail", params: productParams(item) });
              }}
            >
              <View style={[styles.productIconWrap, { backgroundColor: colors.background }]}>
                <ProductImage uri={item.thumbnail} icon={item.icon} size={44} />
              </View>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.productCategory, { color: colors.subtext }]}>
                  {item.brand ? `${item.brand} · ` : ""}{categoryLabel(item.category)}
                </Text>
                <Text style={[styles.productRating, { color: colors.subtext }]}>⭐ {item.rating}</Text>
              </View>
              <Text style={[styles.productPrice, { color: colors.primary }]}>${formatPrice(item.price)}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 },
  backButton: { marginRight: 10, padding: 6 },
  backButtonText: { fontSize: 22, fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "bold" },
  searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 12, gap: 8 },
  searchContainer: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 16, borderWidth: 1 },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16 },
  clearBtn: { fontSize: 16, padding: 4 },
  filterToggle: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  filterPanel: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(128,128,128,0.08)",
  },
  sectionLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8, textTransform: "uppercase" },
  filterChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginHorizontal: 20, marginBottom: 16 },
  tagButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  tagText: { fontSize: 13, fontWeight: "600" },
  section: { marginHorizontal: 20, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  clearAllText: { fontSize: 13, fontWeight: "600" },
  recentChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
  trendingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
  },
  trendingRank: { fontSize: 13, fontWeight: "800" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 16, textAlign: "center" },
  list: { paddingHorizontal: 20 },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  productIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productIcon: { fontSize: 28 },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  productCategory: { fontSize: 12, marginBottom: 4 },
  productRating: { fontSize: 12 },
  productPrice: { fontSize: 16, fontWeight: "bold" },
});