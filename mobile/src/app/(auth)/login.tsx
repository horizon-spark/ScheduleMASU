import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    // Фейковый токен для теста
    await signIn("fake-token-123");
    router.replace("/(app)");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вход в приложение</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Войти (тест)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  button: {
    backgroundColor: "#0055A5",
    padding: 15,
    borderRadius: 25,
    paddingHorizontal: 40,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
