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
import { findProduct } from "@/lib/products";
import { useRecommendations } from "@/lib/recommendations";

const categories = [
  { id: "1", name: "Electronics", icon: "📱", color: "#6C63FF" },
  { id: "2", name: "Fashion", icon: "👗", color: "#FF6584" },
  { id: "3", name: "Sports", icon: "⚽", color: "#43E97B" },
  { id: "4", name: "Books", icon: "📚", color: "#FFB800" },
  { id: "5", name: "Beauty", icon: "💄", color: "#FF6584" },
  { id: "6", name: "Gaming", icon: "🎮", color: "#6C63FF" },
  { id: "7", name: "Travel", icon: "🧳", color: "#4ECDC4" },
  { id: "8", name: "Office", icon: "💼", color: "#FFB800" },
];

const featuredProducts = [
  { id: "1", name: "iPhone 15 Pro", price: 999, originalPrice: 1199, rating: 4.8, icon: "📱", badge: "Best Seller" },
  { id: "2", name: "Nike Air Max", price: 129, originalPrice: 180, rating: 4.5, icon: "👟", badge: "Popular" },
  { id: "3", name: "MacBook Pro", price: 1999, originalPrice: 2499, rating: 4.9, icon: "💻", badge: "Top Rated" },
  { id: "4", name: "Sony Headphones", price: 299, originalPrice: 399, rating: 4.7, icon: "🎧", badge: "New" },
  { id: "5", name: "iPad Pro", price: 799, originalPrice: 999, rating: 4.8, icon: "📱", badge: "Sale" },
  { id: "6", name: "Samsung TV", price: 799, originalPrice: 1199, rating: 4.6, icon: "📺", badge: "Deal" },
];

const allProducts = [
  { id: "1", name: "iPhone 15 Pro", price: 999, originalPrice: 1199, rating: 4.8, icon: "📱", category: "Electronics" },
  { id: "2", name: "Nike Air Max 270", price: 129, originalPrice: 180, rating: 4.5, icon: "👟", category: "Fashion" },
  { id: "3", name: "MacBook Pro 16\"", price: 1999, originalPrice: 2499, rating: 4.9, icon: "💻", category: "Electronics" },
  { id: "4", name: "Sony WH-1000XM5", price: 299, originalPrice: 399, rating: 4.7, icon: "🎧", category: "Electronics" },
  { id: "5", name: "Samsung 65\" TV", price: 799, originalPrice: 1199, rating: 4.6, icon: "📺", category: "Electronics" },
  { id: "6", name: "Adidas Ultraboost", price: 189, originalPrice: 220, rating: 4.4, icon: "👟", category: "Fashion" },
  { id: "7", name: "Nespresso Machine", price: 79, originalPrice: 99, rating: 4.3, icon: "☕", category: "Home" },
  { id: "8", name: "Lululemon Yoga Mat", price: 88, originalPrice: 98, rating: 4.6, icon: "🧘", category: "Sports" },
  { id: "9", name: "Atomic Habits", price: 18, originalPrice: 25, rating: 4.9, icon: "📖", category: "Books" },
  { id: "10", name: "Charlotte Tilbury", price: 65, originalPrice: 75, rating: 4.7, icon: "💄", category: "Beauty" },
  { id: "11", name: "iPad Pro 12.9\"", price: 1099, originalPrice: 1199, rating: 4.8, icon: "📱", category: "Electronics" },
  { id: "12", name: "Levi's 501 Jeans", price: 69, originalPrice: 89, rating: 4.4, icon: "👖", category: "Fashion" },
  { id: "13", name: "Nintendo Switch", price: 349, originalPrice: 399, rating: 4.8, icon: "🎮", category: "Gaming" },
  { id: "14", name: "Gaming Headset", price: 89, originalPrice: 120, rating: 4.6, icon: "🎧", category: "Gaming" },
  { id: "15", name: "Carry-On Luggage", price: 129, originalPrice: 180, rating: 4.5, icon: "🧳", category: "Travel" },
  { id: "16", name: "Travel Pillow", price: 27, originalPrice: 35, rating: 4.4, icon: "🛏️", category: "Travel" },
  { id: "17", name: "Ergonomic Mouse", price: 59, originalPrice: 79, rating: 4.6, icon: "🖱️", category: "Office" },
  { id: "18", name: "Standing Desk", price: 249, originalPrice: 349, rating: 4.7, icon: "🖥️", category: "Office" },
  { id: "19", name: "AirPods Pro", price: 199, originalPrice: 249, rating: 4.8, icon: "🎧", category: "Electronics" },
  { id: "20", name: "Apple Watch", price: 399, originalPrice: 499, rating: 4.7, icon: "⌚", category: "Electronics" },
];

const banners = [
  { id: "1", title: "Big Sale! 🔥", subtitle: "Up to 70% off Electronics", color: "#6C63FF", icon: "📱", category: "Electronics" },
  { id: "2", title: "New Arrivals ✨", subtitle: "Latest Fashion Collection", color: "#FF6584", icon: "👗", category: "Fashion" },
  { id: "3", title: "Free Delivery 🚚", subtitle: "On orders above $50", color: "#43E97B", icon: "🛍️", category: null },
];

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

  const navigateToProduct = (item: any) => {
    router.push({
      pathname: "/(stack)/product-detail",
      params: {
        id: item.id,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        rating: item.rating,
        icon: item.icon,
      },
    });
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
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.categoriesList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryItem, { backgroundColor: item.color + "20" }]}
            onPress={() =>
              router.push({
                pathname: "/(stack)/category",
                params: { name: item.name },
              })
            }
          >
            <View style={[styles.categoryIconWrap, { backgroundColor: item.color }]}>
              <Text style={styles.categoryIcon}>{item.icon}</Text>
            </View>
            <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
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
            {item.badge && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
            <Text style={styles.featuredIcon}>{item.icon}</Text>
            <Text style={[styles.featuredName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.originalPrice, { color: colors.subtext }]}>
              ${item.originalPrice}
            </Text>
            <Text style={[styles.featuredPrice, { color: colors.primary }]}>${item.price}</Text>
            <Text style={[styles.featuredRating, { color: colors.subtext }]}>⭐ {item.rating}</Text>
          </TouchableOpacity>
        )}
      />

      {/* All Products - Vertical Scroll Grid */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🛍️ All Products</Text>
        <Text style={[styles.productCount, { color: colors.subtext }]}>{allProducts.length} items</Text>
      </View>

      <View style={styles.grid}>
        {allProducts.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.gridCard,
              { width: (width - 44) / 2 },
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => navigateToProduct(item)}
          >
            <Text style={styles.gridIcon}>{item.icon}</Text>
            <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.gridOriginal, { color: colors.subtext }]}>
              ${item.originalPrice}
            </Text>
            <Text style={[styles.gridPrice, { color: colors.primary }]}>${item.price}</Text>
            <View style={styles.gridFooter}>
              <Text style={[styles.gridRating, { color: colors.subtext }]}>⭐ {item.rating}</Text>
              <Text style={[styles.gridDiscount, { color: "#43E97B" }]}>
                {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% off
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

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
  featuredIcon: { fontSize: 44, textAlign: "center", marginBottom: 8 },
  featuredName: { fontSize: 13, fontWeight: "bold", marginBottom: 4, height: 34 },
  originalPrice: { fontSize: 11, textDecorationLine: "line-through", marginBottom: 2 },
  featuredPrice: { fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  featuredRating: { fontSize: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10 },
  gridCard: { borderRadius: 16, padding: 12, borderWidth: 1, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  gridIcon: { fontSize: 44, textAlign: "center", marginBottom: 8 },
  gridName: { fontSize: 13, fontWeight: "bold", marginBottom: 4, height: 36 },
  gridOriginal: { fontSize: 11, textDecorationLine: "line-through", marginBottom: 2 },
  gridPrice: { fontSize: 15, fontWeight: "bold", marginBottom: 6 },
  gridFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  gridRating: { fontSize: 11 },
  gridDiscount: { fontSize: 11, fontWeight: "bold" },
});