import ProductImage from "@/components/ProductImage";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import { MAX_COMPARE, buildSpecRows, findComparable, isElectronics } from "@/lib/compare";
import type { Product } from "@/lib/products";
import { productParams, useCatalog } from "@/lib/productsApi";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LABEL_W = 108;
const COL_W = 150;
const HEADER_H = 178;
const ROW_H = 64;

export default function Compare() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const { products: catalog, loading } = useCatalog();
  const base = catalog.find((p) => p.id === id);

  const comparable = useMemo(() => (base ? findComparable(base, catalog, 50) : null), [base, catalog]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Start with the product itself plus the closest matches.
  useEffect(() => {
    if (base && comparable) {
      setSelectedIds([base.id, ...comparable.products.slice(0, MAX_COMPARE - 1).map((p) => p.id)]);
    }
  }, [base?.id, comparable]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = selectedIds
    .map((sid) => catalog.find((p) => p.id === sid))
    .filter((p): p is Product => !!p);
  const others = (comparable?.products ?? []).filter((p) => !selectedIds.includes(p.id));
  const rows = useMemo(() => buildSpecRows(selected), [selected]);
  const hasFreeformSpecs = rows.some((r) => r.key.startsWith("spec:"));

  if (loading && !base) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!base || !comparable) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.subtext }}>Product not found.</Text>
      </View>
    );
  }
  if (!isElectronics(base)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.subtext, textAlign: "center", padding: 30 }}>
          Spec comparison is available for electronics.
        </Text>
      </View>
    );
  }

  const open = (p: Product) => router.push({ pathname: "/(stack)/product-detail", params: productParams(p) });
  const remove = (pid: string) => setSelectedIds((ids) => ids.filter((x) => x !== pid));
  const addProduct = (pid: string) => setSelectedIds((ids) => (ids.length >= MAX_COMPARE ? ids : [...ids, pid]));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <View style={styles.intro}>
        <Text style={[styles.introTitle, { color: colors.text }]}>Electronics around ${base.price.toFixed(0)}</Text>
        <Text style={[styles.introText, { color: colors.subtext }]}>
          ${comparable.min.toFixed(0)} – ${comparable.max.toFixed(0)} (±{Math.round(comparable.band * 100)}%) ·{" "}
          {comparable.total} other product{comparable.total === 1 ? "" : "s"} in this range
        </Text>
      </View>

      {selected.length < 2 ? (
        <Text style={[styles.note, { color: colors.subtext, marginHorizontal: 16 }]}>
          No other electronics are priced close to this one yet.
        </Text>
      ) : (
        <View style={[styles.table, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {/* Sticky label column */}
          <View style={{ width: LABEL_W }}>
            <View style={[styles.cornerCell, { height: HEADER_H, borderColor: colors.border }]}>
              <Text style={[styles.cornerText, { color: colors.subtext }]}>✓ marks the best value in a row</Text>
            </View>
            {rows.map((r, i) => (
              <View
                key={r.key}
                style={[styles.labelCell, { height: ROW_H, borderColor: colors.border, backgroundColor: i % 2 ? colors.card : colors.background }]}
              >
                <Text style={[styles.labelText, { color: colors.text }]} numberOfLines={2}>
                  {r.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Product columns */}
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={{ flexDirection: "row", height: HEADER_H }}>
                {selected.map((p) => (
                  <View key={p.id} style={[styles.headerCell, { width: COL_W, borderColor: colors.border }]}>
                    {p.id !== base.id ? (
                      <TouchableOpacity
                        style={[styles.removeBtn, { backgroundColor: colors.background }]}
                        onPress={() => remove(p.id)}
                        accessibilityLabel={`Remove ${p.name} from comparison`}
                      >
                        <Text style={{ color: colors.subtext, fontSize: 12 }}>✕</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.thisBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.thisBadgeText}>This item</Text>
                      </View>
                    )}
                    <TouchableOpacity onPress={() => open(p)} style={{ alignItems: "center" }}>
                      <ProductImage uri={p.thumbnail} icon={p.icon} size={64} />
                      <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cartBtn, { backgroundColor: colors.primary }]}
                      onPress={() =>
                        addToCart({ id: p.id, name: p.name, price: p.price, icon: p.icon, image: p.thumbnail })
                      }
                    >
                      <Text style={styles.cartBtnText}>🛒 Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              {rows.map((r, i) => (
                <View key={r.key} style={{ flexDirection: "row", height: ROW_H, backgroundColor: i % 2 ? colors.card : colors.background }}>
                  {r.values.map((v, col) => {
                    const isBest = r.best === col;
                    return (
                      <View key={col} style={[styles.valueCell, { width: COL_W, borderColor: colors.border }]}>
                        <Text
                          style={[styles.valueText, { color: colors.text, fontWeight: isBest ? "700" : "400" }]}
                          numberOfLines={isBest ? 2 : 3}
                        >
                          {v}
                        </Text>
                        {isBest && (
                          <Text style={[styles.bestText, { color: colors.success }]}>✓ {r.bestHint}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {!hasFreeformSpecs && selected.length >= 2 && (
        <Text style={[styles.note, { color: colors.subtext, marginHorizontal: 16 }]}>
          ℹ️ This product data doesn't include detailed specs like RAM, storage or screen size. Add them to a
          product's <Text style={{ fontWeight: "700" }}>specs</Text> field in Supabase (for example{" "}
          {'{"RAM": "8 GB"}'}) and they'll appear as extra rows here.
        </Text>
      )}

      {others.length > 0 && (
        <View style={styles.othersSection}>
          <Text style={[styles.othersTitle, { color: colors.text }]}>
            More in this price range{selected.length >= MAX_COMPARE ? ` (remove one to add, max ${MAX_COMPARE})` : ""}
          </Text>
          {others.map((p) => (
            <View key={p.id} style={[styles.otherRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ProductImage uri={p.thumbnail} icon={p.icon} size={40} />
              <TouchableOpacity style={{ flex: 1 }} onPress={() => open(p)}>
                <Text style={[styles.otherName, { color: colors.text }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.otherMeta, { color: colors.subtext }]}>
                  ${p.price.toFixed(2)} · ⭐ {p.rating.toFixed(1)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={selected.length >= MAX_COMPARE}
                onPress={() => addProduct(p.id)}
                style={[styles.addCompareBtn, { borderColor: colors.primary, opacity: selected.length >= MAX_COMPARE ? 0.4 : 1 }]}
              >
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>+ Compare</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  intro: { padding: 16, paddingBottom: 10 },
  introTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  introText: { fontSize: 13 },
  table: { flexDirection: "row", marginHorizontal: 16, borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  cornerCell: { justifyContent: "flex-end", padding: 10, borderRightWidth: 1, borderBottomWidth: 1 },
  cornerText: { fontSize: 11, lineHeight: 15 },
  labelCell: { justifyContent: "center", paddingHorizontal: 10, borderRightWidth: 1 },
  labelText: { fontSize: 12, fontWeight: "700" },
  headerCell: { alignItems: "center", justifyContent: "space-between", padding: 10, borderRightWidth: 1, borderBottomWidth: 1 },
  removeBtn: { alignSelf: "flex-end", width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  thisBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  thisBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  productName: { fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 6 },
  cartBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  cartBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  valueCell: { justifyContent: "center", paddingHorizontal: 10, borderRightWidth: 1 },
  valueText: { fontSize: 12, lineHeight: 16 },
  bestText: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  othersSection: { marginHorizontal: 16, marginTop: 20 },
  othersTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 10 },
  otherRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  otherName: { fontSize: 13, fontWeight: "700" },
  otherMeta: { fontSize: 12, marginTop: 2 },
  addCompareBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});
