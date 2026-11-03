import { useTheme } from "@/context/ThemeContext";
import {
  deleteAddress,
  fetchAddresses,
  formatAddress,
  friendlyError,
  setDefaultAddress,
  useFocusedQuery,
  type Address,
} from "@/lib/account";
import { confirm, showMessage } from "@/lib/dialogs";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Addresses() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: addresses, loading, refreshing, error, reload, refresh } = useFocusedQuery<Address[]>(
    fetchAddresses,
    []
  );

  const handleDelete = async (a: Address) => {
    const ok = await confirm("Delete address?", `"${a.label}" — ${formatAddress(a)}`, {
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAddress(a.id);
      reload();
    } catch (e) {
      showMessage("Couldn't delete address", friendlyError(e));
    }
  };

  const handleMakeDefault = async (a: Address) => {
    try {
      await setDefaultAddress(a.id);
      reload();
    } catch (e) {
      showMessage("Couldn't update address", friendlyError(e));
    }
  };

  const addNew = () => router.push("/(stack)/address-form");

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
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, addresses.length === 0 && { flexGrow: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          error ? (
            <View style={[styles.errorBox, { borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity onPress={reload}>
                <Text style={[styles.retry, { color: colors.primary }]}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          error ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved addresses</Text>
              <Text style={[styles.emptyText, { color: colors.subtext }]}>
                Add a delivery address to check out faster.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: item.isDefault ? colors.primary : colors.border },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
              {item.isDefault ? (
                <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => handleMakeDefault(item)}>
                  <Text style={[styles.makeDefault, { color: colors.primary }]}>Set as default</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.name, { color: colors.text }]}>{item.fullName}</Text>
            <Text style={[styles.address, { color: colors.subtext }]}>{formatAddress(item)}</Text>
            {!!item.phone && <Text style={[styles.address, { color: colors.subtext }]}>📞 {item.phone}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: colors.border }]}
                onPress={() => router.push({ pathname: "/(stack)/address-form", params: { id: item.id } })}
              >
                <Text style={[styles.editText, { color: colors.text }]}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, { borderColor: colors.error }]}
                onPress={() => handleDelete(item)}
              >
                <Text style={[styles.deleteText, { color: colors.error }]}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: colors.primary, marginBottom: insets.bottom + 16 }]}
        onPress={addNew}
      >
        <Text style={styles.addBtnText}>+ Add New Address</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 20, paddingBottom: 8 },
  card: { borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 16, fontWeight: "bold" },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  defaultText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  makeDefault: { fontSize: 13, fontWeight: "700" },
  name: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  address: { fontSize: 13, lineHeight: 19, marginBottom: 2 },
  actions: { flexDirection: "row", gap: 12, marginTop: 12 },
  editBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  editText: { fontWeight: "bold" },
  deleteBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  deleteText: { fontWeight: "bold" },
  addBtn: { marginHorizontal: 20, marginTop: 8, padding: 16, borderRadius: 14, alignItems: "center" },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: "center" },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { fontSize: 13, marginBottom: 6 },
  retry: { fontSize: 13, fontWeight: "700" },
});
