import { View, Text, Pressable, StyleSheet } from "react-native";

interface Props {
  onRetry: () => void;
}

export function ErrorScreen({ onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>😕</Text>
      <Text style={styles.title}>Não foi possível carregar</Text>
      <Text style={styles.subtitle}>
        Verifique sua conexão e tente novamente.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={onRetry}
      >
        <Text style={styles.buttonText}>Tentar novamente</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  emoji: { fontSize: 48 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: { fontSize: 16, color: "#EDE9FE", textAlign: "center" },
  button: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  pressed: { opacity: 0.8 },
  buttonText: { color: "#8B5CF6", fontWeight: "700", fontSize: 16 },
});
