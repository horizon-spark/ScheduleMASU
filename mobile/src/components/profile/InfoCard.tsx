// src/components/profile/InfoCard.tsx
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  children: ReactNode;
};

export function InfoCard({ title, children }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  row: { marginVertical: 5 },
  label: { fontSize: 14, color: "#666", marginBottom: 3 },
  value: { fontSize: 16, color: "#333", fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 10 },
});
