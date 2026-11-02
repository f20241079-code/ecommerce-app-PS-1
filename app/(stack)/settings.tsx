import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendLocalNotification } from "@/lib/notifications";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Modal,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function Settings() {
  const { colors, theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [selectedInfo, setSelectedInfo] = useState<{ title: string; content: string } | null>(null);

  const handleNotificationsToggle = async (value: boolean) => {
    setNotifications(value);
    if (!value) {
      Alert.alert("Notifications disabled", "You will no longer receive app alerts.");
      return;
    }

    try {
      await sendLocalNotification("Notifications enabled", "You will now receive updates from Shoply.");
      Alert.alert("Notifications enabled", "You will now receive updates from Shoply.");
    } catch (error) {
      Alert.alert("Notifications", "Notifications are enabled locally, but your device preview may not display them.");
    }
  };

  const handleEmailToggle = (value: boolean) => {
    setEmailUpdates(value);
    Alert.alert(
      value ? "Email updates on" : "Email updates off",
      value ? "You’ll receive product and promo emails." : "You’ll stop receiving promotional emails."
    );
  };

  const handleOrderToggle = (value: boolean) => {
    setOrderUpdates(value);
    Alert.alert(
      value ? "Order updates on" : "Order updates off",
      value ? "You’ll be notified about order changes." : "Order status notifications are now off."
    );
  };

  const openSupport = () => {
    setSelectedInfo({
      title: "Contact Support",
      content:
        "Need help with an order, account, or delivery? Our support team is available 24/7 to assist you.\n\nEmail: support@shoply.app\nPhone: +1-800-555-0199\nHours: 24/7 live assistance"
    });
  };

  const openPrivacy = () => {
    setSelectedInfo({
      title: "Privacy Policy",
      content:
        "We protect your personal data and use it only to power your shopping experience, secure your account, and improve support services.\n\nYour information is never sold to third parties, and you can request access or deletion at any time."
    });
  };

  const openTerms = () => {
    setSelectedInfo({
      title: "Terms of Service",
      content:
        "By using Shoply, you agree to keep your account information accurate, follow our community rules, and use our services for lawful purchases only.\n\nReturns, refunds, and delivery policies are subject to the latest version posted in the app."
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings ⚙️</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Preferences</Text>
      <Text style={[styles.helperText, { color: colors.subtext }]}>Adjust alerts and app preferences from here.</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Push Notifications</Text>
            <Text style={[styles.settingSubLabel, { color: colors.subtext }]}>Receive push notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={handleNotificationsToggle}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            <Text style={[styles.settingSubLabel, { color: colors.subtext }]}>Switch to dark theme</Text>
          </View>
          <Switch
            value={theme === "dark"}
            onValueChange={toggleTheme}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Email Updates</Text>
            <Text style={[styles.settingSubLabel, { color: colors.subtext }]}>Receive email newsletters</Text>
          </View>
          <Switch
            value={emailUpdates}
            onValueChange={handleEmailToggle}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
          <View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Order Updates</Text>
            <Text style={[styles.settingSubLabel, { color: colors.subtext }]}>Get notified about orders</Text>
          </View>
          <Switch
            value={orderUpdates}
            onValueChange={handleOrderToggle}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.subtext }]}>Help & Support</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.aboutItem, { borderBottomColor: colors.border }]}
          onPress={openSupport}
          activeOpacity={0.8}
        >
          <Text style={[styles.settingLabel, { color: colors.text }]}>Contact Support</Text>
          <Text style={[styles.arrow, { color: colors.subtext }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.aboutItem, { borderBottomColor: colors.border }]}
          onPress={openPrivacy}
          activeOpacity={0.8}
        >
          <Text style={[styles.settingLabel, { color: colors.text }]}>Privacy Policy</Text>
          <Text style={[styles.arrow, { color: colors.subtext }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.aboutItem, { borderBottomWidth: 0 }]}
          onPress={openTerms}
          activeOpacity={0.8}
        >
          <Text style={[styles.settingLabel, { color: colors.text }]}>Terms of Service</Text>
          <Text style={[styles.arrow, { color: colors.subtext }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <TouchableOpacity style={[styles.aboutItem, { borderBottomWidth: 0 }]}> 
          <Text style={[styles.settingLabel, { color: colors.text }]}>App Version</Text>
          <Text style={[styles.version, { color: colors.subtext }]}>1.0.0</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!selectedInfo}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedInfo(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedInfo?.title}</Text>
            <Text style={[styles.modalBody, { color: colors.subtext }]}>{selectedInfo?.content}</Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={() => setSelectedInfo(null)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  backButton: { marginRight: 12 },
  backButtonText: { fontSize: 16, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "bold" },
  sectionTitle: { fontSize: 16, fontWeight: "bold", paddingHorizontal: 20, marginBottom: 4 },
  helperText: { fontSize: 12, paddingHorizontal: 20, marginBottom: 8 },
  card: { marginHorizontal: 20, borderRadius: 12, marginBottom: 24, borderWidth: 1 },
  settingItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  settingLabel: { fontSize: 16, marginBottom: 2 },
  settingSubLabel: { fontSize: 12 },
  aboutItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  arrow: { fontSize: 20 },
  version: { fontSize: 14 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  modalBody: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  modalButton: { borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  modalButtonText: { color: "#fff", fontWeight: "600" },
});