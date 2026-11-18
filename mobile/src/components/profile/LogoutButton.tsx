// src/components/profile/LogoutButton.tsx
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
} from "react-native";

type Props = {
  onPress: () => void;
  loading?: boolean;
};

export function LogoutButton({ onPress, loading }: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, loading && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>Выйти</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#0055A5",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  text: { color: "white", fontSize: 16, fontWeight: "bold" },
});
