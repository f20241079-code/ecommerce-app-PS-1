import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";

export default function EditProfile() {
  const router = useRouter();
  const { colors } = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setFullName(user?.user_metadata?.full_name || "");
      setEmail(user?.email || "");
      setPhone(user?.user_metadata?.phone || "");
      setAvatarUrl(user?.user_metadata?.avatar_url || null);
    });
  }, []);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to your photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      await uploadImage(result.assets[0].base64, result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to your camera");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      await uploadImage(result.assets[0].base64, result.assets[0].uri);
    }
  };

  const uploadImage = async (base64: string, uri: string) => {
    setUploading(true);
    try {
      const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${Date.now()}.${fileExt}`;
      const contentType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://lgdjadfaigbhqvwcnrxm.supabase.co/storage/v1/object/avatars/${fileName}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": contentType,
            "x-upsert": "true",
          },
          body: Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setAvatarUrl(data.publicUrl);
      Alert.alert("Success", "Photo uploaded! Don't forget to save changes.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert("Change Photo", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, phone, avatar_url: avatarUrl },
    });
    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>

      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={showImageOptions} disabled={uploading}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {fullName.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
          )}
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <Text style={{ color: "#fff", fontSize: 12 }}>Uploading...</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={showImageOptions} disabled={uploading}>
          <Text style={[styles.changePhoto, { color: colors.primary }]}>
            {uploading ? "Uploading..." : "Change Photo"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          placeholderTextColor={colors.subtext}
        />

        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <TextInput
          style={[styles.input, styles.disabledInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={email}
          editable={false}
          placeholderTextColor={colors.subtext}
        />

        <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter your phone number"
          placeholderTextColor={colors.subtext}
          keyboardType="phone-pad"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveBtnText}>
          {loading ? "Saving..." : "Save Changes"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  title: { fontSize: 24, fontWeight: "bold", paddingHorizontal: 20, marginBottom: 20 },
  avatarContainer: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  avatarText: { fontSize: 32, color: "#fff", fontWeight: "bold" },
  uploadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 8, borderRadius: 40, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  changePhoto: { fontWeight: "bold" },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 8 },
  input: { padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16, borderWidth: 1 },
  disabledInput: { opacity: 0.5 },
  saveBtn: { margin: 20, padding: 16, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});