import { View, Text, Pressable, StyleSheet } from "react-native";

interface Props {
  onRetry: () => void;
  debugInfo?: string;
}

export function ErrorScreen({ onRetry, debugInfo }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>😕</Text>
      <Text style={styles.title}>Não foi possível carregar</Text>
      <Text style={styles.subtitle}>
        Verifique sua conexão e tente novamente.
      </Text>
      {debugInfo ? (
        <Text style={styles.debug}>{debugInfo}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tentar novamente"
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
    backgroundColor: "#0C1A19",
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
  subtitle: { fontSize: 16, color: "#F8FFFE", textAlign: "center" },
  button: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  pressed: { opacity: 0.8 },
  buttonText: { color: "#0D9488", fontWeight: "700", fontSize: 16 },
  debug: {
    fontSize: 11,
    color: "#2DD4BF",
    textAlign: "center",
    fontFamily: "monospace",
    marginTop: 4,
  },
});
