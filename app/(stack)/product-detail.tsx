import React, { useState } from "react";
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
import { findProduct } from "@/lib/products";
import { useSimilarProducts } from "@/lib/recommendations";

const { width } = Dimensions.get("window");

const productDescriptions: { [key: string]: string } = {
  "iPhone 15 Pro": "The most powerful iPhone ever with A17 Pro chip, titanium design, and advanced camera system with 5x optical zoom. Features USB-C connectivity and Action Button.",
  "Nike Air Max 270": "Experience ultimate comfort with Nike's largest heel Air unit yet. Breathable mesh upper with foam midsole for all-day wear and style.",
  "MacBook Pro 16\"": "Supercharged by M3 Pro chip. Up to 22 hours battery life. Liquid Retina XDR display with ProMotion technology. Perfect for professionals.",
  "Sony WH-1000XM5": "Industry-leading noise canceling with auto NC optimizer. 30-hour battery life with quick charge. Crystal clear hands-free calling.",
  "Samsung 65\" TV": "Quantum HDR 32x, Real Game Enhancer+. Stunning 4K picture quality with Neural Quantum Processor. Smart TV with built-in streaming.",
};

export default function ProductDetail() {
  const { name, price, rating, icon, id, originalPrice, reviews, badge, description } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(0);
  const catalogProduct = findProduct(id as string, name as string);
  const similar = useSimilarProducts(catalogProduct?.id);

  const inWishlist = isInWishlist(id as string);
  const discount = originalPrice ? Math.round(((Number(originalPrice) - Number(price)) / Number(originalPrice)) * 100) : 0;
  const productDesc = description as string || productDescriptions[name as string] || catalogProduct?.description || "Premium quality product with excellent features and durability. Perfect for everyday use and comes with a 1 year warranty and free returns within 30 days.";

  const colors_list = ["⚫", "⚪", "🔵", "🔴"];

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: id as string,
        name: name as string,
        price: Number(price),
        icon: icon as string,
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
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Product Image Area */}
        <View style={[styles.imageSection, { backgroundColor: colors.card }]}>
          {badge && (
            <View style={[styles.badgeTop, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{badge as string}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.wishlistTop} onPress={handleWishlist}>
            <Text style={{ fontSize: 28 }}>{inWishlist ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>
          <Text style={styles.productIcon}>{icon}</Text>
          {discount > 0 && (
            <View style={[styles.discountBadge, { backgroundColor: "#43E97B" }]}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Name & Rating */}
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>⭐⭐⭐⭐⭐</Text>
            <Text style={[styles.ratingText, { color: colors.subtext }]}>
              {rating} ({reviews ? Number(reviews).toLocaleString() : "1,234"} reviews)
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.primary }]}>${price}</Text>
            {originalPrice && Number(originalPrice) > Number(price) && (
              <Text style={[styles.originalPrice, { color: colors.subtext }]}>${originalPrice}</Text>
            )}
            {discount > 0 && (
              <View style={[styles.saveBadge, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.saveText, { color: colors.primary }]}>Save ${Number(originalPrice) - Number(price)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Color Selection */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Color</Text>
          <View style={styles.colorsRow}>
            {colors_list.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorBtn,
                  { borderColor: selectedColor === index ? colors.primary : colors.border },
                ]}
                onPress={() => setSelectedColor(index)}
              >
                <Text style={{ fontSize: 20 }}>{color}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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
              Total: <Text style={{ color: colors.primary, fontWeight: "bold" }}>${(Number(price) * quantity).toLocaleString()}</Text>
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          <Text style={[styles.description, { color: colors.subtext }]}>{productDesc}</Text>
        </View>

        {/* Features */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
          {[
            "✅ Free delivery on orders above $50",
            "✅ 30-day easy returns",
            "✅ 1 year warranty included",
            "✅ Authentic product guaranteed",
            "✅ 24/7 customer support",
          ].map((feature, index) => (
            <Text key={index} style={[styles.feature, { color: colors.subtext }]}>{feature}</Text>
          ))}
        </View>

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
          <Text style={styles.addToCartText}>🛒 Add to Cart — ${(Number(price) * quantity).toLocaleString()}</Text>
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
  colorsRow: { flexDirection: "row", gap: 12 },
  colorBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  qtyBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  qtyBtnText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  qtyNumber: { fontSize: 20, fontWeight: "bold", minWidth: 30, textAlign: "center" },
  qtyTotal: { fontSize: 14, marginLeft: 8 },
  description: { fontSize: 14, lineHeight: 22 },
  feature: { fontSize: 13, marginBottom: 6, lineHeight: 20 },
  relatedSection: { marginHorizontal: 16, marginBottom: 12 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", padding: 16, gap: 12, borderTopWidth: 1, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  wishlistBtn: { width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  addToCartBtn: { flex: 1, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  addToCartText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});