import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    emoji: "🛍️",
    title: "Discover Products",
    subtitle: "Browse thousands of items across every category, all in one place.",
  },
  {
    id: "2",
    emoji: "⚡",
    title: "Fast & Secure Checkout",
    subtitle: "Multiple payment options with a smooth, secure checkout experience.",
  },
  {
    id: "3",
    emoji: "📦",
    title: "Track Your Orders",
    subtitle: "Get real-time updates from checkout to delivery, every step of the way.",
  },
];

export default function Onboarding() {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const router = useRouter();
  const { colors } = useTheme();

  const finishOnboarding = () => {
    router.replace("/(auth)/login");
  };

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      finishOnboarding();
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <TouchableOpacity style={styles.skipBtn} onPress={finishOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  width: index === activeIndex ? 22 : 8,
                  backgroundColor: index === activeIndex ? colors.white : "rgba(255,255,255,0.4)",
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.white }]} onPress={handleNext}>
          <Text style={[styles.nextBtnText, { color: colors.primary }]}>
            {activeIndex === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: { position: "absolute", top: 60, right: 24, zIndex: 10, padding: 8 },
  skipText: { color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: "600" },
  slide: { justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 36,
  },
  iconEmoji: { fontSize: 64 },
  slideTitle: { fontSize: 26, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 14 },
  slideSubtitle: { fontSize: 15, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 22 },
  footer: { paddingHorizontal: 30, paddingBottom: 50, alignItems: "center" },
  dotsRow: { flexDirection: "row", gap: 8, marginBottom: 28 },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: { width: "100%", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  nextBtnText: { fontSize: 16, fontWeight: "700" },
});