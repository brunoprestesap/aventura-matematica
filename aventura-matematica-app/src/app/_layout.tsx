import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/*
        translucent={true} permite que o conteúdo se estenda por baixo da
        status bar — necessário para edge-to-edge correto no Android 16.
        O padding é controlado via useSafeAreaInsets nas telas filhas.
      */}
      <StatusBar style="light" backgroundColor="#8B5CF6" translucent />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
