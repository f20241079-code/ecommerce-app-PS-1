import { Stack } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

export default function StackLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="product-detail" options={{ title: "Product Details" }} />
      {/* These screens draw their own header with a back button. */}
      <Stack.Screen name="checkout" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="order-history" options={{ title: "Order History 📦" }} />
      <Stack.Screen name="addresses" options={{ title: "My Addresses 📍" }} />
      <Stack.Screen name="address-form" options={{ title: "Address" }} />
      <Stack.Screen name="compare" options={{ title: "Compare Specs ⚖️" }} />
      <Stack.Screen name="categories" options={{ title: "All Categories" }} />
      <Stack.Screen name="edit-profile" options={{ title: "Edit Profile" }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="category" options={{ headerShown: false }} />
    </Stack>
  );
}