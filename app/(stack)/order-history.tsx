import { useTheme } from "@/context/ThemeContext";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const orders = [
  { id: "1", date: "June 25, 2026", status: "Delivered", total: 999, items: ["📱 iPhone 15 Pro"] },
  { id: "2", date: "June 20, 2026", status: "Delivered", total: 258, items: ["👟 Nike Air Max x2"] },
  { id: "3", date: "June 15, 2026", status: "Cancelled", total: 299, items: ["🎧 Sony Headphones"] },
];

export default function OrderHistory() {
  const { colors } = useTheme();

  const statusColor = (status: string) => {
    if (status === "Delivered") return colors.success;
    if (status === "Cancelled") return colors.error;
    return colors.primary;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.header}> 
        <Text style={[styles.subtitle, { color: colors.subtext }]}>A quick view of your recent purchases</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.cardHeader}>
              <Text style={[styles.orderId, { color: colors.text }]}>Order #{item.id}</Text>
              <Text style={[styles.status, { color: statusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
            <Text style={[styles.date, { color: colors.subtext }]}>{item.date}</Text>
            {item.items.map((i, index) => (
              <Text key={index} style={[styles.item, { color: colors.text }]}>{i}</Text>
            ))}
            <View style={styles.cardFooter}>
              <Text style={[styles.total, { color: colors.text }]}>Total: ${item.total}</Text>
              <TouchableOpacity style={[styles.reorderBtn, { backgroundColor: colors.primary }]}> 
                <Text style={styles.reorderText}>Reorder</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 13 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: { borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  orderId: { fontSize: 16, fontWeight: "700" },
  status: { fontSize: 13, fontWeight: "700" },
  date: { fontSize: 12, marginBottom: 10 },
  item: { fontSize: 14, marginBottom: 4 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, borderTopWidth: 1, paddingTop: 10 },
  total: { fontSize: 15, fontWeight: "700" },
  reorderBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  reorderText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});