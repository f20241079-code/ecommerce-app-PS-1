import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Profile() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);

  const menuItems = [
    { id: "1", icon: "📦", label: "Order History", sublabel: "Track your orders", route: "/(stack)/order-history" },
    { id: "2", icon: "📍", label: "Address Management", sublabel: "Manage delivery addresses", route: "/(stack)/addresses" },
    { id: "3", icon: "✏️", label: "Edit Profile", sublabel: "Update your info", route: "/(stack)/edit-profile" },
    { id: "4", icon: "🔔", label: "Notifications", sublabel: "Manage alerts", route: "/(stack)/settings" },
    { id: "5", icon: "⚙️", label: "Settings", sublabel: "App preferences", route: "/(stack)/settings" },
    { id: "6", icon: "❓", label: "Help & Support", sublabel: "Get assistance", onPress: () => Alert.alert("Help & Support", "Email: support@shoply.app\nPhone: +1-800-555-0199") },
  ];

  useEffect(() => {
    const fetchUser = () => {
      supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    };
    fetchUser();
    const { data: listener } = supabase.auth.onAuthStateChange(() => fetchUser());
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || "U";
    return name.charAt(0).toUpperCase();
  };

  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Banner */}
      <View style={[styles.headerBanner, { backgroundColor: colors.primary, paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.editHeaderBtn}
          onPress={() => router.push("/(stack)/edit-profile" as any)}
        >
          <Text style={styles.editHeaderText}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          )}
          <View style={[styles.onlineDot, { backgroundColor: "#43E97B" }]} />
        </View>

        {/* User Info */}
        <Text style={[styles.name, { color: colors.text }]}>
          {user?.user_metadata?.full_name || "User"}
        </Text>
        <Text style={[styles.email, { color: colors.subtext }]}>{user?.email || ""}</Text>

        {/* Member Badge */}
        <View style={[styles.memberBadge, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.memberText, { color: colors.primary }]}>⭐ Premium Member</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>12</Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Orders</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>5</Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Wishlist</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>3</Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Reviews</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>$240</Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>Saved</Text>
        </View>
      </View>

      {/* Menu */}
      <Text style={[styles.sectionTitle, { color: colors.subtext }]}>ACCOUNT</Text>
      <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              { borderBottomColor: colors.border },
              index === menuItems.length - 1 && { borderBottomWidth: 0 },
            ]}
            onPress={() => {
              if (item.onPress) item.onPress();
              else if (item.route) router.push(item.route as any);
            }}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <View style={styles.menuInfo}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.menuSublabel, { color: colors.subtext }]}>{item.sublabel}</Text>
            </View>
            <Text style={[styles.menuArrow, { color: colors.subtext }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.error }]}
        onPress={handleLogout}
      >
        <Text style={[styles.logoutText, { color: colors.error }]}>🚪 Logout</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.subtext }]}>Version 1.0.0</Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBanner: { paddingBottom: 60, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  editHeaderBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  editHeaderText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  profileCard: { marginHorizontal: 20, marginTop: -40, borderRadius: 20, padding: 20, alignItems: "center", borderWidth: 1, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, marginBottom: 16 },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44, justifyContent: "center", alignItems: "center" },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarText: { fontSize: 34, color: "#fff", fontWeight: "bold" },
  onlineDot: { position: "absolute", bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#fff" },
  name: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  email: { fontSize: 13, marginBottom: 12 },
  memberBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  memberText: { fontSize: 13, fontWeight: "600" },
  statsRow: { flexDirection: "row", marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
  stat: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "bold" },
  statLabel: { fontSize: 11, marginTop: 3 },
  statDivider: { width: 1 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", paddingHorizontal: 20, marginBottom: 8, letterSpacing: 1 },
  menu: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1 },
  menuIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  menuIcon: { fontSize: 20 },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  menuSublabel: { fontSize: 12 },
  menuArrow: { fontSize: 22 },
  logoutBtn: { marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 14, alignItems: "center", borderWidth: 1.5 },
  logoutText: { fontSize: 16, fontWeight: "bold" },
  version: { textAlign: "center", fontSize: 12, marginBottom: 8 },
});