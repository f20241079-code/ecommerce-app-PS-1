import { useTheme } from "@/context/ThemeContext";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const addresses = [
  { id: "1", label: "Home", address: "123 Main Street", city: "New York, NY 10001", default: true },
  { id: "2", label: "Work", address: "456 Office Ave", city: "New York, NY 10002", default: false },
];

export default function Addresses() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.cardHeader}>
              <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
              {item.default && (
                <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}> 
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
            </View>
            <Text style={[styles.address, { color: colors.text }]}>{item.address}</Text>
            <Text style={[styles.city, { color: colors.subtext }]}>{item.city}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.editBtn, { borderColor: colors.border }]}> 
                <Text style={[styles.editText, { color: colors.text }]}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.error }]}> 
                <Text style={[styles.deleteText, { color: colors.error }]}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]}> 
        <Text style={styles.addBtnText}>+ Add New Address</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  title: { fontSize: 24, fontWeight: "bold", paddingHorizontal: 20, marginBottom: 20 },
  list: { paddingHorizontal: 20 },
  card: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 16, fontWeight: "bold" },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  defaultText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  address: { fontSize: 14, marginBottom: 4 },
  city: { fontSize: 14, marginBottom: 12 },
  actions: { flexDirection: "row", gap: 12 },
  editBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: "center", borderWidth: 1 },
  editText: { fontWeight: "bold" },
  deleteBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: "center", borderWidth: 1 },
  deleteText: { fontWeight: "bold" },
  addBtn: { margin: 20, padding: 16, borderRadius: 12, alignItems: "center" },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});