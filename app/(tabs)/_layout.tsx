import { useTheme } from "@/context/ThemeContext";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Leave room for the iPhone home indicator / Android gesture bar.
  const bottomPad = Math.max(insets.bottom, 8);
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 58 + bottomPad,
          paddingTop: 6,
          paddingBottom: bottomPad,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarBadgeStyle: { backgroundColor: colors.primary, color: "#fff", fontSize: 10 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="🏠" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="🛒" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: "Wishlist",
          tabBarBadge: wishlistCount > 0 ? wishlistCount : undefined,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="❤️" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="👤" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  // Emoji ignore tint colour, so show the selected tab with size + opacity.
  return (
    <Text style={{ fontSize: focused ? 24 : 21, opacity: focused ? 1 : 0.55 }}>{name}</Text>
  );
}
