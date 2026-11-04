import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import type { Product } from "@/lib/products";
import type { RecommendationResult } from "@/lib/recommendations";
import { productParams, formatPrice } from "@/lib/productsApi";
import ProductImage from "@/components/ProductImage";

type Props = {
  title: string;
  result: RecommendationResult | null;
  style?: object;
};

/** Horizontal row of recommended products. Tapping a card opens its detail page. */
export default function RecommendedProducts({ title, result, style }: Props) {
  const router = useRouter();
  const { colors } = useTheme();

  if (!result || result.items.length === 0) return null;

  const open = (p: Product) =>
    router.push({ pathname: "/(stack)/product-detail", params: productParams(p) });

  return (
    <View style={style}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {result.source === "ml" && (
          <View style={[styles.aiBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.aiBadgeText}>✨ AI</Text>
          </View>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroller} contentContainerStyle={styles.row}>
        {result.items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => open(item)}
          >
            <ProductImage uri={item.thumbnail} icon={item.icon} size={56} style={styles.icon} />
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.price, { color: colors.primary }]}>${formatPrice(item.price)}</Text>
            <Text style={[styles.rating, { color: colors.subtext }]}>⭐ {item.rating}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  title: { fontSize: 16, fontWeight: "bold" },
  aiBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  aiBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  // flexGrow: 0 stops Android from stretching a horizontal list to fill the screen.
  scroller: { flexGrow: 0 },
  row: { paddingRight: 6 },
  card: { width: 120, borderRadius: 14, padding: 12, marginRight: 10, borderWidth: 1, alignItems: "center" },
  icon: { marginBottom: 6 },
  name: { fontSize: 11, fontWeight: "bold", marginBottom: 4, textAlign: "center", height: 28 },
  price: { fontSize: 13, fontWeight: "bold", marginBottom: 2 },
  rating: { fontSize: 10 },
});
