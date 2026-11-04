import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import RecommendedProducts from "@/components/RecommendedProducts";
import ProductImage from "@/components/ProductImage";
import { categoryLabel, findProduct } from "@/lib/products";
import { formatPrice, useCatalog, useProductReviews } from "@/lib/productsApi";
import { useSimilarProducts } from "@/lib/recommendations";
import PriceHistoryCard from "@/components/PriceHistoryCard";
import { findComparable, isElectronics } from "@/lib/compare";

const { width } = Dimensions.get("window");

export default function ProductDetail() {
  const params = useLocalSearchParams<{
    id?: string; name?: string; price?: string; originalPrice?: string; rating?: string;
    reviews?: string; icon?: string; badge?: string; description?: string;
  }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  // Prefer the live catalog record; fall back to whatever the caller passed.
  const { version, products: catalog } = useCatalog();
  const catalogProduct = useMemo(
    () => findProduct(params.id, params.name),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.id, params.name, version]
  );
  const id = catalogProduct?.id ?? String(params.id ?? "");
  const name = catalogProduct?.name ?? String(params.name ?? "");
  const price = catalogProduct?.price ?? Number(params.price ?? 0);
  const originalPrice = catalogProduct?.originalPrice ?? (params.originalPrice ? Number(params.originalPrice) : undefined);
  const rating = catalogProduct?.rating ?? Number(params.rating ?? 0);
  const reviews = catalogProduct?.reviews ?? (params.reviews ? Number(params.reviews) : undefined);
  const icon = catalogProduct?.icon ?? String(params.icon ?? "🛍️");
  const badge = catalogProduct?.badge || params.badge || "";
  const description = catalogProduct?.description || params.description || "";
  const images = catalogProduct?.images?.length
    ? catalogProduct.images
    : catalogProduct?.thumbnail
      ? [catalogProduct.thumbnail]
      : [];

  const similar = useSimilarProducts(catalogProduct?.id);
  const comparableCount = useMemo(
    () => (catalogProduct && isElectronics(catalogProduct) ? findComparable(catalogProduct, catalog).total : 0),
    [catalogProduct, catalog]
  );
  const { reviews: reviewList } = useProductReviews(catalogProduct?.id);
  const imageSize = Math.min(width - 140, 280);

  const inWishlist = isInWishlist(id as string);
  const discount = originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const productDesc = description.trim();


  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: id as string,
        name: name as string,
        price: Number(price),
        icon: icon as string,
        image: catalogProduct?.thumbnail,
      });
    }
    Alert.alert("Added to Cart! 🛒", `${quantity}x ${name} added to your cart`, [
      { text: "Continue Shopping", style: "cancel" },
      { text: "View Cart", onPress: () => router.push("/(tabs)/cart") },
    ]);
  };

  const handleWishlist = () => {
    if (inWishlist) {
      removeFromWishlist(id as string);
    } else {
      addToWishlist({
        id: id as string,
        name: name as string,
        price: Number(price),
        rating: Number(rating),
        icon: icon as string,
        image: catalogProduct?.thumbnail,
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Product Image Area */}
        <View style={[styles.imageSection, { backgroundColor: colors.card }]}>
          {!!badge && (
            <View style={[styles.badgeTop, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{badge as string}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.wishlistTop} onPress={handleWishlist}>
            <Text style={{ fontSize: 28 }}>{inWishlist ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>
          {images.length > 0 ? (
            <View style={{ alignItems: "center" }}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={{ width: imageSize }}
                onMomentumScrollEnd={(e) =>
                  setImageIndex(Math.round(e.nativeEvent.contentOffset.x / imageSize))
                }
              >
                {images.map((uri) => (
                  <ProductImage key={uri} uri={uri} icon={icon} size={imageSize} />
                ))}
              </ScrollView>
              {images.length > 1 && (
                <View style={styles.dotsRow}>
                  {images.map((uri, i) => (
                    <View
                      key={uri}
                      style={[styles.dot, { backgroundColor: i === imageIndex ? colors.primary : colors.border }]}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.productIcon}>{icon}</Text>
          )}
          {discount > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: "#43E97B" }]}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Brand, Name & Rating */}
          {(catalogProduct?.brand || catalogProduct?.category) && (
            <Text style={[styles.brand, { color: colors.primary }]}>
              {[catalogProduct?.brand, catalogProduct && categoryLabel(catalogProduct.category)]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{"⭐".repeat(Math.max(1, Math.round(rating)))}</Text>
            <Text style={[styles.ratingText, { color: colors.subtext }]}>
              {rating}
              {reviews !== undefined ? ` (${reviews.toLocaleString()} review${reviews === 1 ? "" : "s"})` : ""}
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.primary }]}>${formatPrice(price)}</Text>
            {originalPrice && Number(originalPrice) > Number(price) && (
              <Text style={[styles.originalPrice, { color: colors.subtext }]}>${formatPrice(originalPrice)}</Text>
            )}
            {discount > 0 && (
              <View style={[styles.saveBadge, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.saveText, { color: colors.primary }]}>
                  Save ${formatPrice(Math.round((Number(originalPrice) - price) * 100) / 100)}
                </Text>
              </View>
            )}
          </View>
          {typeof catalogProduct?.stock === "number" && (
            <Text
              style={[
                styles.stock,
                { color: catalogProduct.stock === 0 ? colors.error : catalogProduct.stock < 10 ? "#FFB800" : "#43E97B" },
              ]}
            >
              {catalogProduct.stock === 0
                ? "Out of stock"
                : catalogProduct.stock < 10
                  ? `Only ${catalogProduct.stock} left in stock`
                  : "In stock"}
            </Text>
          )}
        </View>

        {/* Description */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          {productDesc ? (
            <Text style={[styles.description, { color: colors.subtext }]}>{productDesc}</Text>
          ) : (
            <Text style={[styles.description, { color: colors.subtext, fontStyle: "italic" }]}>
              No description available for this product.
            </Text>
          )}
          {!!catalogProduct?.tags?.length && (
            <View style={styles.tagsRow}>
              {catalogProduct.tags.slice(0, 6).map((t) => (
                <View key={t} style={[styles.tag, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.tagText, { color: colors.subtext }]}>#{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Price vs time */}
        {catalogProduct && <PriceHistoryCard productId={catalogProduct.id} currentPrice={catalogProduct.price} />}

        {/* Spec comparison with similarly priced electronics */}
        {comparableCount > 0 && (
          <TouchableOpacity
            style={[styles.compareCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={() => router.push({ pathname: "/(stack)/compare", params: { id } })}
          >
            <Text style={{ fontSize: 26 }}>⚖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.compareTitle, { color: colors.text }]}>Compare specs</Text>
              <Text style={[styles.compareText, { color: colors.subtext }]}>
                {comparableCount} other electronic{comparableCount === 1 ? "" : "s"} in a similar price range
              </Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "700" }}>›</Text>
          </TouchableOpacity>
        )}

        {/* Quantity */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quantity</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.qtyNumber, { color: colors.text }]}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
            <Text style={[styles.qtyTotal, { color: colors.subtext }]}>
              Total: <Text style={{ color: colors.primary, fontWeight: "bold" }}>${formatPrice(Math.round(price * quantity * 100) / 100)}</Text>
            </Text>
          </View>
        </View>


        {/* Features / product details */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {catalogProduct?.shipping ? "Details" : "Features"}
          </Text>
          {(catalogProduct?.shipping
            ? [
                catalogProduct.availabilityStatus && `📦 ${catalogProduct.availabilityStatus}`,
                `🚚 ${catalogProduct.shipping}`,
                catalogProduct.warranty && `🛡️ ${catalogProduct.warranty}`,
                catalogProduct.returnPolicy && `↩️ ${catalogProduct.returnPolicy}`,
              ]
            : [
                "✅ Free delivery on orders above $50",
                "✅ 30-day easy returns",
                "✅ 1 year warranty included",
                "✅ Authentic product guaranteed",
                "✅ 24/7 customer support",
              ]
          )
            .filter(Boolean)
            .map((feature, index) => (
              <Text key={index} style={[styles.feature, { color: colors.subtext }]}>{feature}</Text>
            ))}
        </View>

        {/* Customer reviews */}
        {reviewList.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer Reviews</Text>
            {reviewList.map((r, i) => (
              <View
                key={r.id}
                style={[styles.review, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
              >
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewName, { color: colors.text }]}>{r.reviewerName}</Text>
                  <Text style={styles.reviewStars}>{"⭐".repeat(r.rating)}</Text>
                </View>
                <Text style={[styles.reviewComment, { color: colors.subtext }]}>{r.comment}</Text>
                <Text style={[styles.reviewDate, { color: colors.subtext }]}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Related Products (ML recommendations) */}
        <RecommendedProducts
          title="You May Also Like"
          result={similar}
          style={styles.relatedSection}
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.wishlistBtn, { borderColor: inWishlist ? colors.error : colors.primary }]}
          onPress={handleWishlist}
        >
          <Text style={{ fontSize: 24 }}>{inWishlist ? "❤️" : "🤍"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addToCartBtn, { backgroundColor: colors.primary }]}
          onPress={handleAddToCart}
        >
          <Text style={styles.addToCartText}>🛒 Add to Cart — ${formatPrice(Math.round(price * quantity * 100) / 100)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageSection: { alignItems: "center", paddingVertical: 40, paddingTop: 60, position: "relative" },
  badgeTop: { position: "absolute", top: 60, left: 20, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  wishlistTop: { position: "absolute", top: 56, right: 20 },
  productIcon: { fontSize: 120 },
  discountBadge: { position: "absolute", bottom: 16, right: 20, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  discountText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  infoCard: { margin: 16, borderRadius: 16, padding: 16, borderWidth: 1 },
  name: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  stars: { fontSize: 14 },
  ratingText: { fontSize: 13 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  price: { fontSize: 28, fontWeight: "bold" },
  originalPrice: { fontSize: 16, textDecorationLine: "line-through" },
  saveBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  saveText: { fontSize: 12, fontWeight: "bold" },
  section: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  qtyBtnText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  qtyNumber: { fontSize: 20, fontWeight: "bold", minWidth: 30, textAlign: "center" },
  qtyTotal: { fontSize: 14, marginLeft: 8 },
  description: { fontSize: 14, lineHeight: 22 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11 },
  feature: { fontSize: 13, marginBottom: 6, lineHeight: 20 },
  brand: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  stock: { fontSize: 13, fontWeight: "600", marginTop: 10 },
  dotsRow: { flexDirection: "row", gap: 6, marginTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  review: { paddingVertical: 10 },
  reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  reviewName: { fontSize: 14, fontWeight: "bold" },
  reviewStars: { fontSize: 11 },
  reviewComment: { fontSize: 13, lineHeight: 19 },
  reviewDate: { fontSize: 11, marginTop: 4 },
  compareCard: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1.5 },
  compareTitle: { fontSize: 15, fontWeight: "bold" },
  compareText: { fontSize: 12, marginTop: 2 },
  relatedSection: { marginHorizontal: 16, marginBottom: 12 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", padding: 16, gap: 12, borderTopWidth: 1, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  wishlistBtn: { width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  addToCartBtn: { flex: 1, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  addToCartText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});