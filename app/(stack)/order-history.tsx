import ProductImage from "@/components/ProductImage";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import {
  cancelOrder,
  fetchOrders,
  formatAddress,
  friendlyError,
  useFocusedQuery,
  type Order,
  type OrderStatus,
} from "@/lib/account";
import { confirm, showMessage } from "@/lib/dialogs";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_LABEL: Record<Order["paymentMethod"], string> = {
  card: "Card",
  upi: "UPI",
  cod: "Cash on Delivery",
};

const money = (n: number) => `$${n.toFixed(2)}`;

export default function OrderHistory() {
  const { colors } = useTheme();
  const router = useRouter();
  const { addToCart } = useCart();
  const { placed } = useLocalSearchParams<{ placed?: string }>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: orders, loading, refreshing, error, reload, refresh } = useFocusedQuery<Order[]>(fetchOrders, []);

  const statusColor = (status: OrderStatus) =>
    status === "delivered" ? colors.success : status === "cancelled" ? colors.error : colors.primary;

  const reorder = (order: Order) => {
    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        addToCart({ id: item.productId, name: item.name, price: item.price, icon: item.icon, image: item.image ?? undefined });
      }
    }
    router.push("/(tabs)/cart");
  };

  const cancel = async (order: Order) => {
    const ok = await confirm("Cancel order?", `Order #${order.orderNumber} will be cancelled.`, {
      confirmText: "Cancel order",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(order.id);
    try {
      await cancelOrder(order.id);
      reload();
    } catch (e) {
      showMessage("Couldn't cancel order", friendlyError(e));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, orders.length === 0 && { flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            {!!placed && (
              <View style={[styles.successBox, { backgroundColor: colors.success + "18", borderColor: colors.success }]}>
                <Text style={[styles.successText, { color: colors.success }]}>
                  🎉 Order #{placed} placed! We'll let you know when it ships.
                </Text>
              </View>
            )}
            {!!error && (
              <View style={[styles.errorBox, { borderColor: colors.error }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                <TouchableOpacity onPress={reload}>
                  <Text style={[styles.retry, { color: colors.primary }]}>Try again</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          error ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No orders yet</Text>
              <Text style={[styles.emptyText, { color: colors.subtext }]}>When you place an order it will show up here.</Text>
              <TouchableOpacity
                style={[styles.shopBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.replace("/(tabs)/home")}
              >
                <Text style={styles.shopBtnText}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => {
          const itemCount = item.items.reduce((n, i) => n + i.quantity, 0);
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.orderId, { color: colors.text }]}>Order #{item.orderNumber}</Text>
                <View style={[styles.statusPill, { backgroundColor: statusColor(item.status) + "20" }]}>
                  <Text style={[styles.status, { color: statusColor(item.status) }]}>{STATUS_LABEL[item.status]}</Text>
                </View>
              </View>
              <Text style={[styles.meta, { color: colors.subtext }]}>
                {new Date(item.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                {" · "}
                {itemCount} item{itemCount === 1 ? "" : "s"} · {PAYMENT_LABEL[item.paymentMethod]}
              </Text>

              {item.items.map((i) => (
                <View key={i.productId} style={styles.itemRow}>
                  <ProductImage uri={i.image} icon={i.icon} size={40} style={[styles.itemImage, { backgroundColor: colors.background }]} />
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                    {i.name}
                  </Text>
                  <Text style={[styles.itemQty, { color: colors.subtext }]}>×{i.quantity}</Text>
                  <Text style={[styles.itemPrice, { color: colors.text }]}>{money(i.price * i.quantity)}</Text>
                </View>
              ))}

              <Text style={[styles.address, { color: colors.subtext }]} numberOfLines={2}>
                📍 {formatAddress(item.shippingAddress)}
              </Text>

              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={[styles.total, { color: colors.text }]}>Total {money(item.total)}</Text>
                  {item.savings > 0 && (
                    <Text style={[styles.saved, { color: colors.success }]}>You saved {money(item.savings)}</Text>
                  )}
                </View>
                <View style={styles.footerBtns}>
                  {item.status === "placed" && (
                    <TouchableOpacity
                      style={[styles.cancelBtn, { borderColor: colors.error }]}
                      onPress={() => cancel(item)}
                      disabled={busyId === item.id}
                    >
                      {busyId === item.id ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <Text style={[styles.cancelText, { color: colors.error }]}>Cancel</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.reorderBtn, { backgroundColor: colors.primary }]} onPress={() => reorder(item)}>
                    <Text style={styles.reorderText}>Reorder</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 20, paddingBottom: 32 },
  card: { borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  orderId: { fontSize: 16, fontWeight: "700" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  status: { fontSize: 12, fontWeight: "700" },
  meta: { fontSize: 12, marginBottom: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 10 },
  itemImage: { borderRadius: 8 },
  itemName: { flex: 1, fontSize: 14 },
  itemQty: { fontSize: 13 },
  itemPrice: { fontSize: 14, fontWeight: "600", minWidth: 70, textAlign: "right" },
  address: { fontSize: 12, marginTop: 4 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTopWidth: 1, paddingTop: 12 },
  total: { fontSize: 15, fontWeight: "700" },
  saved: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  footerBtns: { flexDirection: "row", gap: 8 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, minWidth: 70, alignItems: "center" },
  cancelText: { fontWeight: "700", fontSize: 12 },
  reorderBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  reorderText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: "center", marginBottom: 20 },
  shopBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  shopBtnText: { color: "#fff", fontWeight: "bold" },
  successBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 },
  successText: { fontSize: 14, fontWeight: "600" },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { fontSize: 13, marginBottom: 6 },
  retry: { fontSize: 13, fontWeight: "700" },
});
