import { useCart } from "@/context/CartContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import ProductImage from "@/components/ProductImage";
import { sendLocalNotification } from "@/lib/notifications";
import {
  fetchAddresses,
  formatAddress,
  friendlyError,
  placeOrder,
  useFocusedQuery,
  type Address,
  type Order,
} from "@/lib/account";
import { showMessage } from "@/lib/dialogs";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const steps = ["Cart", "Address", "Payment", "Confirm"];

const paymentMethods = [
  { id: "card", label: "Credit / Debit Card", detail: "Visa, Mastercard, RuPay", icon: "💳" },
  { id: "upi", label: "UPI", detail: "Google Pay, PhonePe, Paytm", icon: "📲" },
  { id: "cod", label: "Cash on Delivery", detail: "Pay when it arrives", icon: "💵" },
];

export default function Checkout() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, total, clearCart } = useCart();
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<Order["paymentMethod"]>("card");
  const [placing, setPlacing] = useState(false);
  const {
    data: addresses,
    loading: addressesLoading,
    error: addressesError,
    reload: reloadAddresses,
  } = useFocusedQuery<Address[]>(fetchAddresses, []);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Keep the selection valid; otherwise pick the default (or newest) address.
  useEffect(() => {
    if (selectedAddressId && addresses.some((a) => a.id === selectedAddressId)) return;
    const preferred = addresses.find((a) => a.isDefault) ?? addresses[0];
    setSelectedAddressId(preferred?.id ?? null);
  }, [addresses, selectedAddressId]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  // Same rule as the cart: free delivery from $50.
  const delivery = total >= 50 ? 0 : 5;
  const grandTotal = total + delivery;
  const money = (n: number) => n.toFixed(2);

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setStepIndex(1);
      return;
    }
    setPlacing(true);
    try {
      const order = await placeOrder(
        items.map((i) => ({ id: i.id, quantity: i.quantity })),
        selectedAddress.id,
        selectedPayment
      );
      clearCart();
      sendLocalNotification(
        "Order Placed! 🎉",
        `Order #${order.orderNumber} for $${money(order.total)} has been placed.`
      ).catch(() => {});
      router.replace({ pathname: "/(stack)/order-history", params: { placed: String(order.orderNumber) } });
    } catch (e) {
      showMessage("Couldn't place your order", friendlyError(e));
    } finally {
      setPlacing(false);
    }
  };

  const canContinue = stepIndex !== 1 || !!selectedAddress;

  const goNext = () => {
    if (!canContinue || placing) return;
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
            {addressesLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : addressesError ? (
              <View style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.error }]}>
                <Text style={{ color: colors.error, marginBottom: 8 }}>{addressesError}</Text>
                <TouchableOpacity onPress={reloadAddresses}>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {addresses.length === 0 && (
                  <Text style={[styles.addressText, { color: colors.subtext, marginBottom: 12 }]}>
                    You don't have a saved address yet. Add one to continue.
                  </Text>
                )}
                {addresses.map((a) => {
                  const isActive = a.id === selectedAddressId;
                  return (
                    <TouchableOpacity
                      key={a.id}
                      style={[
                        styles.addressCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: isActive ? colors.primary : colors.border,
                          borderWidth: isActive ? 2 : 1,
                        },
                      ]}
                      onPress={() => setSelectedAddressId(a.id)}
                    >
                      <View style={styles.addressHeaderRow}>
                        <Text style={{ fontSize: 18 }}>{a.label === "Work" ? "💼" : a.label === "Home" ? "🏠" : "📍"}</Text>
                        <Text style={[styles.addressName, { color: colors.text, flex: 1 }]}>
                          {a.label} · {a.fullName}
                        </Text>
                        <View style={[styles.radioOuter, { borderColor: isActive ? colors.primary : colors.border }]}>
                          {isActive && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                        </View>
                      </View>
                      <Text style={[styles.addressText, { color: colors.subtext }]}>{formatAddress(a)}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.addAddressBtn, { borderColor: colors.primary }]}
                  onPress={() => router.push("/(stack)/address-form")}
                >
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>+ Add New Address</Text>
                </TouchableOpacity>
              </>
            )}
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
                  onPress={() => setSelectedPayment(method.id as Order["paymentMethod"])}
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
            <Text style={[styles.addressText, { color: colors.subtext, marginTop: 4 }]}>
              ℹ️ This is a demo store: no payment is collected when you place an order.
            </Text>
          </View>
        )}

        {/* Step 3: Confirm */}
        {stepIndex === 3 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Review Your Order</Text>
            <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.reviewLabel, { color: colors.subtext }]}>Deliver to</Text>
              <Text style={[styles.reviewValue, { color: colors.text }]}>
                {selectedAddress ? `${selectedAddress.fullName}, ${formatAddress(selectedAddress)}` : "—"}
              </Text>
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
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primary, opacity: canContinue && !placing ? 1 : 0.5 }]}
          onPress={goNext}
          disabled={!canContinue || placing}
        >
          {placing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextBtnText}>
              {stepIndex === steps.length - 1 ? "Place Order 🎉" : "Continue"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addAddressBtn: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 4 },
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