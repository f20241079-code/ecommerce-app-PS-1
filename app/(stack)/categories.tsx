import { useTheme } from "@/context/ThemeContext";
import { useCategories } from "@/lib/productsApi";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** "See All" from Home: every category in the catalog, with product counts. */
export default function Categories() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { categories, loading } = useCategories();
  const columns = width >= 600 ? 4 : 3;
  const tile = (width - 32 - (columns - 1) * 10) / columns;

  if (loading && categories.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={categories}
      key={columns}
      numColumns={columns}
      keyExtractor={(c) => c.slug}
      columnWrapperStyle={{ gap: 10 }}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}
      ListHeaderComponent={
        <Text style={[styles.count, { color: colors.subtext }]}>{categories.length} categories</Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.tile, { width: tile, backgroundColor: item.color + "20" }]}
          onPress={() => router.push({ pathname: "/(stack)/category", params: { name: item.slug } })}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${item.count} products`}
        >
          <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
            <Text style={styles.icon}>{item.icon}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.items, { color: colors.subtext }]}>
            {item.count} item{item.count === 1 ? "" : "s"}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  count: { fontSize: 13, marginBottom: 4 },
  tile: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, alignItems: "center", minHeight: 128 },
  iconWrap: { width: 52, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  icon: { fontSize: 26 },
  name: { fontSize: 12, fontWeight: "700", textAlign: "center", lineHeight: 15 },
  items: { fontSize: 11, marginTop: 3 },
});
