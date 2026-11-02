import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (Platform.OS === "web") {
    console.log("Push notifications are not supported in the web preview.");
    return "web-preview";
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permission not granted for push notifications");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF6B00",
    });
  }

  if (Device.isDevice || Platform.OS === "android") {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      console.log("Expo push token:", tokenData.data);
      return tokenData.data;
    } catch (error) {
      console.log("Unable to fetch Expo push token", error);
    }
  }

  return true;
}

export async function sendLocalNotification(title: string, body: string) {
  if (Platform.OS === "web") {
    console.log("Local notification requested on web preview:", title, body);
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });
}