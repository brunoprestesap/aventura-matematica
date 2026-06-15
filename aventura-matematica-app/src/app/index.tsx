import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebViewBridge } from "@/components/WebViewBridge";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function HomeScreen() {
  const { isConnected } = useNetworkStatus();
  /*
    useSafeAreaInsets em vez de SafeAreaView para controle granular.
    SafeAreaView do react-native está depreciado — não usar.
    Com edge-to-edge, precisamos aplicar padding top/bottom manualmente.
  */
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {isConnected === false && <OfflineBanner />}
      <WebViewBridge />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#8B5CF6",
  },
});
