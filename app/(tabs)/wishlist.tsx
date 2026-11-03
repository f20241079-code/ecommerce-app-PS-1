import { useCart } from "@/context/CartContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useWishlist } from "@/context/WishlistContext";
import ProductImage from "@/components/ProductImage";
import { useRouter } from "expo-router";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function Wishlist() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const { items, removeFromWishlist } = useWishlist();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emptyIcon}>❤️</Text>
        <Text style={[styles.emptyText, { color: colors.text }]}>Your wishlist is empty!</Text>
        <TouchableOpacity
          style={[styles.shopBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/home")}
        >
          <Text style={styles.shopBtnText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <Text style={[styles.title, { color: colors.text }]}>My Wishlist ❤️</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() =>
              router.push({
                pathname: "/(stack)/product-detail",
                params: {
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  rating: item.rating,
                  icon: item.icon,
                },
              })
            }
          >
            <ProductImage uri={item.image} icon={item.icon} size={52} style={styles.icon} />
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.rating, { color: colors.subtext }]}>⭐ {item.rating}</Text>
              <Text style={[styles.price, { color: colors.primary }]}>${item.price.toFixed(2)}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.addToCartBtn, { backgroundColor: colors.primary }]}
                onPress={() =>
                  addToCart({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    icon: item.icon,
                    image: item.image,
                  })
                }
              >
                <Text style={styles.addToCartText}>Add to Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeFromWishlist(item.id)}
              >
                <Text style={styles.removeText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  emptyCard: { width: "100%", borderRadius: 24, borderWidth: 1, padding: 24, alignItems: "center" },
  emptyIcon: { fontSize: 70, marginBottom: 12 },
  emptyText: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  emptySubtext: { fontSize: 14, textAlign: "center", marginBottom: 20 },
  shopBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  shopBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  title: { fontSize: 24, fontWeight: "bold", paddingHorizontal: 20, marginBottom: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 },
  icon: { marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  rating: { fontSize: 12, marginBottom: 4 },
  price: { fontSize: 15, fontWeight: "bold" },
  actions: { alignItems: "center", gap: 8 },
  addToCartBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addToCartText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  removeBtn: { padding: 4 },
  removeText: { fontSize: 20 },
});