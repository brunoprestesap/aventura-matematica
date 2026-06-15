import { View, Text, StyleSheet } from "react-native";

export function OfflineBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>📶 Sem conexão — usando versão salva</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FEF08A",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  text: {
    color: "#713F12",
    fontSize: 13,
    fontWeight: "600",
  },
});
