import { View, ActivityIndicator, StyleSheet } from "react-native";

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
