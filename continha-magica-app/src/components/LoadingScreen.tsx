import { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

export function LoadingScreen() {
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowMessage(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2DD4BF" />
      {showMessage && (
        <Text style={styles.message}>Carregando… pode demorar um momento</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0C1A19",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    gap: 20,
  },
  message: {
    color: "#CCFBF1",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
