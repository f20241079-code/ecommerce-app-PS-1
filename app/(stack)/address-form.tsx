import { useTheme } from "@/context/ThemeContext";
import {
  fetchAddress,
  friendlyError,
  saveAddress,
  validateAddress,
  type AddressInput,
} from "@/lib/account";
import { showMessage } from "@/lib/dialogs";
import { supabase } from "@/lib/supabase";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LABELS = ["Home", "Work", "Other"];

const EMPTY: AddressInput = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  isDefault: false,
};

export default function AddressForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<AddressInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressInput, string>>>({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchAddress(id!)
        .then((a) => {
          if (a) setForm({ ...a });
          else showMessage("Address not found");
        })
        .catch((e) => showMessage("Couldn't load address", friendlyError(e)))
        .finally(() => setLoading(false));
    } else {
      // Pre-fill the recipient with the signed-in user's name.
      supabase.auth.getUser().then(({ data: { user } }) => {
        const name = user?.user_metadata?.full_name;
        if (name) setForm((f) => (f.fullName ? f : { ...f, fullName: name }));
      });
    }
  }, [id, isEdit]);

  const set = <K extends keyof AddressInput>(key: K, value: AddressInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSave = async () => {
    const found = validateAddress(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await saveAddress(form, id);
      router.back();
    } catch (e) {
      showMessage("Couldn't save address", friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  const field = (
    key: keyof AddressInput,
    label: string,
    placeholder: string,
    opts: { keyboardType?: KeyboardTypeOptions; autoCapitalize?: "none" | "words" | "characters"; optional?: boolean } = {}
  ) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        {label}
        {opts.optional && <Text style={{ color: colors.subtext, fontWeight: "400" }}> (optional)</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.card, color: colors.text, borderColor: errors[key] ? colors.error : colors.border },
        ]}
        value={String(form[key] ?? "")}
        onChangeText={(t) => set(key, t as never)}
        placeholder={placeholder}
        placeholderTextColor={colors.subtext}
        keyboardType={opts.keyboardType}
        autoCapitalize={opts.autoCapitalize ?? "words"}
      />
      {!!errors[key] && <Text style={[styles.error, { color: colors.error }]}>{errors[key]}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: isEdit ? "Edit Address" : "New Address" }} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Save as</Text>
        <View style={styles.chips}>
          {LABELS.map((l) => {
            const active = form.label === l;
            return (
              <TouchableOpacity
                key={l}
                style={[
                  styles.chip,
                  { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border },
                ]}
                onPress={() => set("label", l)}
              >
                <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600" }}>
                  {l === "Home" ? "🏠 " : l === "Work" ? "💼 " : "📍 "}
                  {l}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {field("fullName", "Full name", "Who should receive it?")}
        {field("phone", "Phone", "e.g. +91 98765 43210", { keyboardType: "phone-pad", optional: true })}
        {field("line1", "Street address", "House no., building, street")}
        {field("line2", "Apartment, area, landmark", "Optional", { optional: true })}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>{field("city", "City", "City")}</View>
          <View style={{ flex: 1 }}>{field("state", "State", "State", { optional: true })}</View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            {field("postalCode", "Postal / PIN code", "e.g. 411001", { keyboardType: "number-pad", autoCapitalize: "characters" })}
          </View>
          <View style={{ flex: 1 }}>{field("country", "Country", "e.g. India", { optional: true })}</View>
        </View>

        <View style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Use as default address</Text>
            <Text style={[styles.switchHint, { color: colors.subtext }]}>Selected automatically at checkout</Text>
          </View>
          <Switch
            value={!!form.isDefault}
            onValueChange={(v) => set("isDefault", v)}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{isEdit ? "Save Changes" : "Save Address"}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  body: { padding: 20 },
  chips: { flexDirection: "row", gap: 10, marginBottom: 18, marginTop: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  error: { fontSize: 12, marginTop: 4 },
  row: { flexDirection: "row", gap: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 4, marginBottom: 20 },
  switchLabel: { fontSize: 14, fontWeight: "700" },
  switchHint: { fontSize: 12, marginTop: 2 },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
