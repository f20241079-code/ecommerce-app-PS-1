import { useCart } from "@/context/CartContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import ProductImage from "@/components/ProductImage";
import { sendLocalNotification } from "@/lib/notifications";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const steps = ["Cart", "Address", "Payment", "Confirm"];

const paymentMethods = [
  { id: "card", label: "Credit / Debit Card", detail: "**** **** **** 1234", icon: "💳" },
  { id: "upi", label: "UPI", detail: "Pay via any UPI app", icon: "📲" },
  { id: "cod", label: "Cash on Delivery", detail: "Pay when it arrives", icon: "💵" },
];

export default function Checkout() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, total, clearCart } = useCart();
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState("card");

  // Same rule as the cart: free delivery from $50.
  const delivery = total >= 50 ? 0 : 5;
  const grandTotal = total + delivery;
  const money = (n: number) => n.toFixed(2);

  const handlePlaceOrder = async () => {
    await sendLocalNotification(
      "Order Placed! 🎉",
      `Your order of $${money(grandTotal)} has been placed successfully!`
    );
    Alert.alert(
      "Order Placed! 🎉",
      "Your order has been placed successfully!",
      [
        {
          text: "OK",
          onPress: () => {
            clearCart();
            router.replace("/(tabs)/home");
          },
        },
      ]
    );
  };

  const goNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      handlePlaceOrder();
    }
  };

  const goBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else router.back();
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, styles.emptyState, { backgroundColor: colors.background }]}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing to check out</Text>
        <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>Add some products to your cart first.</Text>
        <TouchableOpacity
          style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/(tabs)/home")}
        >
          <Text style={styles.emptyBtnText}>Browse Products</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Checkout</Text>
      </View>

      {/* Progress steps */}
      <View style={styles.stepRow}>
        {steps.map((step, index) => {
          const isDone = index < stepIndex;
          const isActive = index === stepIndex;
          const isLast = index === steps.length - 1;
          return (
            <View key={step} style={styles.stepItem}>
              <View style={styles.stepCircleWrap}>
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor: isDone || isActive ? colors.primary : colors.card,
                      borderColor: isDone || isActive ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: isDone || isActive ? "#fff" : colors.subtext, fontWeight: "700", fontSize: 12 }}>
                    {isDone ? "✓" : index + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: isActive ? colors.primary : colors.subtext, fontWeight: isActive ? "700" : "500" },
                  ]}
                >
                  {step}
                </Text>
              </View>
              {!isLast && (
                <View style={[styles.stepLine, { backgroundColor: isDone ? colors.primary : colors.border }]} />
              )}
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Step 0: Cart */}
        {stepIndex === 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Items</Text>
            {items.map((item) => (
              <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.itemIconWrap, { backgroundColor: colors.background }]}>
                  <ProductImage uri={item.image} icon={item.icon} size={34} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.itemQty, { color: colors.subtext }]}>Qty: {item.quantity}</Text>
                </View>
                <Text style={[styles.itemPrice, { color: colors.primary }]}>${money(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Step 1: Address */}
        {stepIndex === 1 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Address</Text>
            <View style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.addressHeaderRow}>
                <Text style={{ fontSize: 20 }}>📍</Text>
                <Text style={[styles.addressName, { color: colors.text }]}>123 Main Street</Text>
              </View>
              <Text style={[styles.addressText, { color: colors.subtext }]}>New York, NY 10001</Text>
              <TouchableOpacity style={styles.changeAddressBtn}>
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Change Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 2: Payment */}
        {stepIndex === 2 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
            {paymentMethods.map((method) => {
              const isActive = selectedPayment === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isActive ? colors.primary : colors.border,
                      borderWidth: isActive ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedPayment(method.id)}
                >
                  <Text style={{ fontSize: 22, marginRight: 12 }}>{method.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentLabel, { color: colors.text }]}>{method.label}</Text>
                    <Text style={[styles.paymentDetail, { color: colors.subtext }]}>{method.detail}</Text>
                  </View>
                  <View style={[styles.radioOuter, { borderColor: isActive ? colors.primary : colors.border }]}>
                    {isActive && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Step 3: Confirm */}
        {stepIndex === 3 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Review Your Order</Text>
            <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.reviewLabel, { color: colors.subtext }]}>Deliver to</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>123 Main Street, New York, NY 10001</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.reviewLabel, { color: colors.subtext }]}>Payment</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>
                {paymentMethods.find((m) => m.id === selectedPayment)?.label}
              </Text>
            </View>
          </View>
        )}

        {/* Order summary — always visible */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.subtext }]}>Subtotal</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>${money(total)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.subtext }]}>Delivery</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{delivery === 0 ? "FREE" : `$${money(delivery)}`}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>${money(grandTotal)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.footerLabel, { color: colors.subtext }]}>Total</Text>
          <Text style={[styles.footerTotal, { color: colors.text }]}>${money(grandTotal)}</Text>
        </View>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.primary }]} onPress={goNext}>
          <Text style={styles.nextBtnText}>
            {stepIndex === steps.length - 1 ? "Place Order 🎉" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyState: { justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, marginBottom: 24, textAlign: "center" },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 },
  backButton: { marginRight: 10, padding: 6 },
  backButtonText: { fontSize: 22, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "bold" },

  stepRow: { flexDirection: "row", paddingHorizontal: 20, marginBottom: 20, alignItems: "flex-start" },
  stepItem: { flexDirection: "row", alignItems: "flex-start", flex: 1 },
  stepCircleWrap: { alignItems: "center", width: 60 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  stepLabel: { fontSize: 10, textAlign: "center" },
  stepLine: { flex: 1, height: 2, marginTop: 13, marginHorizontal: -4 },

  body: { paddingHorizontal: 20, paddingBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },

  itemCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1 },
  itemIconWrap: { width: 48, height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  itemQty: { fontSize: 12 },
  itemPrice: { fontSize: 15, fontWeight: "700" },

  addressCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  addressHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  addressName: { fontSize: 15, fontWeight: "700" },
  addressText: { fontSize: 13, marginBottom: 2, lineHeight: 19 },
  changeAddressBtn: { marginTop: 10 },

  paymentCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, marginBottom: 10 },
  paymentLabel: { fontSize: 15, fontWeight: "600" },
  paymentDetail: { fontSize: 12, marginTop: 2 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  reviewCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  reviewLabel: { fontSize: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  reviewValue: { fontSize: 15, fontWeight: "600", marginBottom: 4 },

  summaryCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  divider: { height: 1, marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: "700" },
  totalValue: { fontSize: 18, fontWeight: "800" },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderTopWidth: 1,
  },
  footerLabel: { fontSize: 12 },
  footerTotal: { fontSize: 20, fontWeight: "800" },
  nextBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  nextBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});