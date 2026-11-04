import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import ProductImage from "@/components/ProductImage";
import { categoryLabel } from "@/lib/products";
import {
  discountPercent,
  featuredDeals,
  FEATURED_SLUG,
  formatPrice,
  productParams,
  useCatalog,
} from "@/lib/productsApi";

type SortOption = "default" | "price_asc" | "price_desc" | "rating";

export default function Category() {
  const { name } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [showSort, setShowSort] = useState(false);
  const { width } = useWindowDimensions();

  const { products: allProducts, loading } = useCatalog();
  const slug = String(name ?? "");
  const isFeatured = slug === FEATURED_SLUG;
  const title = isFeatured ? "🔥 Featured Deals" : categoryLabel(slug);
  // Match the slug ("mens-shirts") or a display name ("Mens Shirts").
  const filtered = isFeatured
    ? featuredDeals(allProducts)
    : allProducts.filter(
        (p) => p.category === slug || categoryLabel(p.category).toLowerCase() === slug.toLowerCase()
      );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "price_asc") return a.price - b.price;
    if (sortBy === "price_desc") return b.price - a.price;
    if (sortBy === "rating") return b.rating - a.rating;
    return 0;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}
          onPress={() => setShowSort(!showSort)}
        >
          <Text style={styles.sortBtnText}>Sort 🔽</Text>
        </TouchableOpacity>
      </View>

      {/* Sort Menu */}
      {showSort && (
        <View style={[styles.sortMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: "Default", value: "default" },
            { label: "Price: Low to High", value: "price_asc" },
            { label: "Price: High to Low", value: "price_desc" },
            { label: "Top Rated", value: "rating" },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                { borderBottomColor: colors.border },
                sortBy === option.value && { backgroundColor: colors.primary + "20" },
              ]}
              onPress={() => {
                setSortBy(option.value as SortOption);
                setShowSort(false);
              }}
            >
              <Text style={[styles.sortOptionText, { color: sortBy === option.value ? colors.primary : colors.text }]}>
                {option.label}
              </Text>
              {sortBy === option.value && <Text style={{ color: colors.primary }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Count */}
      <View style={styles.countRow}>
        <Text style={[styles.count, { color: colors.subtext }]}>
          {loading ? "Loading products…" : `${sorted.length} products found`}
        </Text>
      </View>

      {/* Products Vertical Scroll Grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {sorted.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                { width: (width - 44) / 2 },
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() =>
                router.push({ pathname: "/(stack)/product-detail", params: productParams(item) })
              }
            >
              {/* Wishlist */}
              <TouchableOpacity
                style={styles.wishlistBtn}
                onPress={() =>
                  isInWishlist(item.id)
                    ? removeFromWishlist(item.id)
                    : addToWishlist({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        rating: item.rating,
                        icon: item.icon,
                        image: item.thumbnail,
                      })
                }
              >
                <Text style={{ fontSize: 18 }}>
                  {isInWishlist(item.id) ? "❤️" : "🤍"}
                </Text>
              </TouchableOpacity>

              {/* Badge */}
              {!!item.badge && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}

              {/* Product Icon */}
              <ProductImage uri={item.thumbnail} icon={item.icon} size={90} style={styles.productIcon} />

              {/* Product Info */}
              <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.originalPrice, { color: colors.subtext }]}>
                ${formatPrice(item.originalPrice)}
              </Text>
              <Text style={[styles.productPrice, { color: colors.primary }]}>
                ${formatPrice(item.price)}
              </Text>
              <View style={styles.ratingRow}>
                <Text style={[styles.rating, { color: colors.subtext }]}>⭐ {item.rating}</Text>
                {discountPercent(item) > 0 && (
                  <Text style={[styles.discount, { color: "#43E97B" }]}>{discountPercent(item)}% off</Text>
                )}
              </View>

              {/* Add to Cart */}
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={() =>
                  addToCart({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    icon: item.icon,
                    image: item.thumbnail,
                  })
                }
              >
                <Text style={styles.addBtnText}>🛒 Add to Cart</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  backText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", flex: 1, textAlign: "center" },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  sortBtnText: { fontSize: 13, fontWeight: "bold", color: "#fff" },
  sortMenu: { marginHorizontal: 20, borderRadius: 12, borderWidth: 1, marginTop: 8, zIndex: 10 },
  sortOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderBottomWidth: 1 },
  sortOptionText: { fontSize: 14 },
  countRow: { paddingHorizontal: 20, paddingVertical: 10 },
  count: { fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10 },
  card: { borderRadius: 16, padding: 12, borderWidth: 1, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  wishlistBtn: { alignSelf: "flex-end", marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start", marginBottom: 6 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  productIcon: { alignSelf: "center", marginBottom: 8 },
  productName: { fontSize: 13, fontWeight: "bold", marginBottom: 4, height: 36 },
  originalPrice: { fontSize: 11, textDecorationLine: "line-through", marginBottom: 2 },
  productPrice: { fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  ratingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  rating: { fontSize: 11 },
  discount: { fontSize: 11, fontWeight: "bold" },
  addBtn: { padding: 8, borderRadius: 10, alignItems: "center" },
  addBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
});