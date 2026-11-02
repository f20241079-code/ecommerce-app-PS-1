import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";
import ProductImage from "@/components/ProductImage";

const { width } = Dimensions.get("window");

export default function Cart() {
  const { items, increaseQuantity, decreaseQuantity, removeFromCart, total } = useCart();
  const { colors } = useTheme();
  const router = useRouter();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  const delivery = total > 50 ? 0 : 5;
  const discount = promoApplied ? Math.round(total * 0.1) : 0;
  const finalTotal = total + delivery - discount;
  const savings = items.reduce((sum, item) => sum + (item.price * 0.2 * item.quantity), 0);

  if (items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIconWrap, { backgroundColor: colors.card }]}>
          <Text style={styles.emptyIcon}>🛒</Text>
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty!</Text>
        <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
          Looks like you haven't added anything yet
        </Text>
        <TouchableOpacity
          style={[styles.shopBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/home")}
        >
          <Text style={styles.shopBtnText}>Start Shopping 🛍️</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>My Cart 🛒</Text>
        <Text style={styles.headerCount}>{items.length} items</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Savings Banner */}
            {savings > 0 && (
              <View style={[styles.savingsBanner, { backgroundColor: "#43E97B20", borderColor: "#43E97B" }]}>
                <Text style={styles.savingsText}>🎉 You're saving ${savings.toFixed(0)} on this order!</Text>
              </View>
            )}

            {/* Free Delivery Banner */}
            {total < 50 && (
              <View style={[styles.deliveryBanner, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}>
                <Text style={[styles.deliveryText, { color: colors.primary }]}>
                  🚚 Add ${(50 - total).toFixed(0)} more for FREE delivery!
                </Text>
              </View>
            )}
            {total >= 50 && (
              <View style={[styles.deliveryBanner, { backgroundColor: "#43E97B20", borderColor: "#43E97B" }]}>
                <Text style={[styles.deliveryText, { color: "#43E97B" }]}>
                  🚚 You qualify for FREE delivery!
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Product Icon */}
            <View style={[styles.iconWrap, { backgroundColor: colors.background }]}>
              <ProductImage uri={item.image} icon={item.icon} size={52} style={styles.itemIcon} />
            </View>

            {/* Product Info */}
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.itemPrice, { color: colors.primary }]}>
                ${item.price} each
              </Text>
              <Text style={[styles.itemTotal, { color: colors.subtext }]}>
                Total: <Text style={{ color: colors.text, fontWeight: "bold" }}>
                  ${(item.price * item.quantity).toLocaleString()}
                </Text>
              </Text>
            </View>

            {/* Quantity & Delete */}
            <View style={styles.rightSection}>
              <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.deleteBtn}>
                <Text style={{ fontSize: 16 }}>🗑️</Text>
              </TouchableOpacity>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => decreaseQuantity(item.id)}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.quantity, { color: colors.text }]}>{item.quantity}</Text>
                <TouchableOpacity
                  style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => increaseQuantity(item.id)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <>
            {/* Order Summary */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Order Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.subtext }]}>Subtotal ({items.length} items)</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>${total.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.subtext }]}>Delivery</Text>
                <Text style={[styles.summaryValue, { color: delivery === 0 ? "#43E97B" : colors.text }]}>
                  {delivery === 0 ? "FREE" : `$${delivery}`}
                </Text>
              </View>

              {promoApplied && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: "#43E97B" }]}>Promo (SAVE10)</Text>
                  <Text style={[styles.summaryValue, { color: "#43E97B" }]}>-${discount}</Text>
                </View>
              )}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>${finalTotal.toFixed(2)}</Text>
              </View>
            </View>

            <View style={{ height: 120 }} />
          </>
        }
      />

      {/* Bottom Checkout Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.bottomTotal}>
          <Text style={[styles.bottomTotalLabel, { color: colors.subtext }]}>Total</Text>
          <Text style={[styles.bottomTotalValue, { color: colors.primary }]}>${finalTotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(stack)/checkout")}
        >
          <Text style={styles.checkoutText}>Checkout →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIconWrap: { width: 120, height: 120, borderRadius: 60, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  shopBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  shopBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  header: { paddingTop: 54, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerCount: { fontSize: 14, color: "rgba(255,255,255,0.8)", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  listContent: { padding: 16 },
  savingsBanner: { borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1 },
  savingsText: { fontSize: 13, fontWeight: "600", color: "#43E97B" },
  deliveryBanner: { borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1 },
  deliveryText: { fontSize: 13, fontWeight: "600" },
  cartItem: { flexDirection: "row", borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  iconWrap: { width: 70, height: 70, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 12 },
  itemIcon: {},
  itemInfo: { flex: 1, justifyContent: "center" },
  itemName: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  itemPrice: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  itemTotal: { fontSize: 12 },
  rightSection: { alignItems: "center", justifyContent: "space-between" },
  deleteBtn: { padding: 4, marginBottom: 8 },
  quantityContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  qtyBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  quantity: { fontSize: 16, fontWeight: "bold", minWidth: 24, textAlign: "center" },
  summaryCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginTop: 4 },
  summaryTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  divider: { height: 1, marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: "bold" },
  totalValue: { fontSize: 20, fontWeight: "bold" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", padding: 16, gap: 16, borderTopWidth: 1, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  bottomTotal: { justifyContent: "center" },
  bottomTotalLabel: { fontSize: 12 },
  bottomTotalValue: { fontSize: 20, fontWeight: "bold" },
  checkoutBtn: { flex: 1, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  checkoutText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});