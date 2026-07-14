import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { storageService } from "../services/storage";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const initialize = async () => {
      await storageService.initialize();
      const token = await AsyncStorage.getItem("auth_token");
      setHasToken(Boolean(token));
      setIsReady(true);
    };

    initialize();
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const inAuthGroup = segments[0] === "auth";

    if (!hasToken && !inAuthGroup) {
      router.replace("/auth/login");
    }

    if (hasToken && inAuthGroup) {
      router.replace("/(tabs)/fridge");
    }
  }, [hasToken, isReady, router, segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="fridge/add" options={{ headerShown: true, title: "Add Item" }} />
    </Stack>
  );
}
