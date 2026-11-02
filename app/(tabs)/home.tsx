import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import RecommendedProducts from "@/components/RecommendedProducts";
import { findProduct, type Product } from "@/lib/products";
import { productParams, useCatalog, useCategories, discountPercent, formatPrice } from "@/lib/productsApi";
import ProductImage from "@/components/ProductImage";
import { useRecommendations } from "@/lib/recommendations";

const PAGE_SIZE = 20;

export default function Home() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { items: cartItems } = useCart();
  const { items: wishlistItems } = useWishlist();

  // The user's interests (cart + wishlist) seed the ML recommendations.
  const seedIds = React.useMemo(
    () =>
      [...cartItems, ...wishlistItems]
        .map((i) => findProduct(i.id, i.name)?.id)
        .filter((id): id is string => !!id),
    [cartItems, wishlistItems]
  );
  const recommendations = useRecommendations(seedIds, 8);

  const { products: allProducts, loading } = useCatalog();
  const { categories } = useCategories();
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

  // Featured = best-rated products with a real discount.
  const featuredProducts = React.useMemo(
    () =>
      [...allProducts]
        .filter((p) => discountPercent(p) > 0)
        .sort((a, b) => b.rating - a.rating || discountPercent(b) - discountPercent(a))
        .slice(0, 8),
    [allProducts]
  );

  // Banners point at real categories from the catalog.
  const banners = React.useMemo(() => {
    const maxDiscount = (slug: string) =>
      Math.max(0, ...allProducts.filter((p) => p.category === slug).map(discountPercent));
    const [first, second] = categories;
    return [
      first && {
        id: "1", title: "Big Sale! 🔥", subtitle: `Up to ${maxDiscount(first.slug)}% off ${first.name}`,
        color: "#6C63FF", icon: first.icon, category: first.slug,
      },
      second && {
        id: "2", title: "Top Picks ✨", subtitle: `Explore ${second.name}`,
        color: "#FF6584", icon: second.icon, category: second.slug,
      },
      {
        id: "3", title: "Free Delivery 🚚", subtitle: "On orders above $50",
        color: "#43E97B", icon: "🛍️", category: null as string | null,
      },
    ].filter(Boolean) as { id: string; title: string; subtitle: string; color: string; icon: string; category: string | null }[];
  }, [allProducts, categories]);

  const navigateToProduct = (item: Product) => {
    router.push({ pathname: "/(stack)/product-detail", params: productParams(item) });
  };

  const navigateToBanner = (banner: any) => {
    if (banner.category) {
      router.push({
        pathname: "/(stack)/category",
        params: { name: banner.category },
      });
    } else {
      router.push("/(stack)/search");
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.greeting}>Good Morning 👋</Text>
          <Text style={styles.headerTitle}>Find Amazing Deals</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Text style={{ fontSize: 22 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <TouchableOpacity
          style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/(stack)/search")}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={[styles.searchPlaceholder, { color: colors.subtext }]}>
            Search products, brands...
          </Text>
        </TouchableOpacity>
      </View>

      {/* Banners - Horizontal Scroll */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.bannerScroll}
      >
        {banners.map((banner) => (
          <TouchableOpacity
            key={banner.id}
            style={[styles.banner, { backgroundColor: banner.color, width: width - 48 }]}
            onPress={() => navigateToBanner(banner)}
            activeOpacity={0.85}
          >
            <Text style={styles.bannerIcon}>{banner.icon}</Text>
            <View>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
              <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
              <View style={styles.bannerBtn}>
                <Text style={[styles.bannerBtnText, { color: banner.color }]}>Shop Now →</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Categories - Horizontal Scroll */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🗂️ Categories</Text>
        <TouchableOpacity>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.categoriesList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryItem, { backgroundColor: item.color + "20" }]}
            onPress={() =>
              router.push({
                pathname: "/(stack)/category",
                params: { name: item.slug },
              })
            }
          >
            <View style={[styles.categoryIconWrap, { backgroundColor: item.color }]}>
              <Text style={styles.categoryIcon}>{item.icon}</Text>
            </View>
            <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Personalised ML recommendations */}
      <RecommendedProducts
        title={seedIds.length > 0 ? "💡 Recommended for You" : "💡 Popular Picks"}
        result={recommendations}
        style={styles.recommendedSection}
      />

      {/* Featured Products - Horizontal Scroll */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🔥 Featured</Text>
        <TouchableOpacity>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={featuredProducts}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.featuredList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.featuredCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigateToProduct(item)}
          >
            {!!item.badge && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
            <ProductImage uri={item.thumbnail} icon={item.icon} size={80} style={styles.featuredIcon} />
            <Text style={[styles.featuredName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.originalPrice, { color: colors.subtext }]}>
              ${formatPrice(item.originalPrice)}
            </Text>
            <Text style={[styles.featuredPrice, { color: colors.primary }]}>${formatPrice(item.price)}</Text>
            <Text style={[styles.featuredRating, { color: colors.subtext }]}>⭐ {item.rating}</Text>
          </TouchableOpacity>
        )}
      />

      {/* All Products - Vertical Scroll Grid */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🛍️ All Products</Text>
        <Text style={[styles.productCount, { color: colors.subtext }]}>{loading ? "Loading…" : `${allProducts.length} items`}</Text>
      </View>

      <View style={styles.grid}>
        {allProducts.slice(0, visibleCount).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.gridCard,
              { width: (width - 44) / 2 },
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => navigateToProduct(item)}
          >
            <ProductImage uri={item.thumbnail} icon={item.icon} size={90} style={styles.gridIcon} />
            <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.gridOriginal, { color: colors.subtext }]}>
              ${formatPrice(item.originalPrice)}
            </Text>
            <Text style={[styles.gridPrice, { color: colors.primary }]}>${formatPrice(item.price)}</Text>
            <View style={styles.gridFooter}>
              <Text style={[styles.gridRating, { color: colors.subtext }]}>⭐ {item.rating}</Text>
              {discountPercent(item) > 0 && (
                <Text style={[styles.gridDiscount, { color: "#43E97B" }]}>{discountPercent(item)}% off</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {visibleCount < allProducts.length && (
        <TouchableOpacity
          style={[styles.loadMoreBtn, { borderColor: colors.primary }]}
          onPress={() => setVisibleCount((n) => n + PAGE_SIZE)}
        >
          <Text style={[styles.loadMoreText, { color: colors.primary }]}>
            Show more ({allProducts.length - visibleCount} left)
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  recommendedSection: { paddingLeft: 20, paddingRight: 10, marginBottom: 20 },
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  searchWrapper: { paddingHorizontal: 20, marginTop: -20, marginBottom: 20 },
  searchContainer: { flexDirection: "row", alignItems: "center", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchPlaceholder: { fontSize: 15, flex: 1 },
  bannerScroll: { paddingLeft: 20, marginBottom: 20 },
  banner: { borderRadius: 20, padding: 20, marginRight: 12, height: 130, flexDirection: "row", alignItems: "center", gap: 16 },
  bannerIcon: { fontSize: 56 },
  bannerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  bannerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.9)", marginBottom: 10 },
  bannerBtn: { backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start" },
  bannerBtnText: { fontSize: 11, fontWeight: "bold" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  seeAll: { fontSize: 14, fontWeight: "600" },
  productCount: { fontSize: 13 },
  categoriesList: { paddingHorizontal: 20, marginBottom: 20 },
  categoryItem: { alignItems: "center", marginRight: 14, padding: 12, borderRadius: 16, width: 82 },
  categoryIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  categoryIcon: { fontSize: 24 },
  categoryName: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  featuredList: { paddingHorizontal: 20, marginBottom: 20 },
  featuredCard: { width: 155, borderRadius: 16, padding: 12, marginRight: 12, borderWidth: 1, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start", marginBottom: 6 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  featuredIcon: { alignSelf: "center", marginBottom: 8 },
  featuredName: { fontSize: 13, fontWeight: "bold", marginBottom: 4, height: 34 },
  originalPrice: { fontSize: 11, textDecorationLine: "line-through", marginBottom: 2 },
  featuredPrice: { fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  featuredRating: { fontSize: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10 },
  gridCard: { borderRadius: 16, padding: 12, borderWidth: 1, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  gridIcon: { alignSelf: "center", marginBottom: 8 },
  loadMoreBtn: { marginHorizontal: 20, marginTop: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: "center" },
  loadMoreText: { fontSize: 14, fontWeight: "bold" },
  gridName: { fontSize: 13, fontWeight: "bold", marginBottom: 4, height: 36 },
  gridOriginal: { fontSize: 11, textDecorationLine: "line-through", marginBottom: 2 },
  gridPrice: { fontSize: 15, fontWeight: "bold", marginBottom: 6 },
  gridFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  gridRating: { fontSize: 11 },
  gridDiscount: { fontSize: 11, fontWeight: "bold" },
});