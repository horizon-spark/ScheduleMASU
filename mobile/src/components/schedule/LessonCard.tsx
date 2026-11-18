// src/components/schedule/LessonCard.tsx
import { StyleSheet, Text, View } from "react-native";
import { Lesson } from "../../api/types";

function splitSlot(slot: string): { start: string; end?: string } {
  const [start, end] = slot.split(" - ");
  return { start: start?.trim() ?? slot, end: end?.trim() };
}

export function LessonCard({ item }: { item: Lesson }) {
  const { start, end } = splitSlot(item.slot);

  return (
    <View style={styles.row}>
      <View style={styles.timeColumn}>
        <Text style={styles.startTime}>{start}</Text>
        {end ? <Text style={styles.endTime}>{end}</Text> : null}
      </View>
      <View style={styles.card}>
        <Text style={styles.subject}>{item.disciplines}</Text>
        <Text style={styles.detail}>{item.type}</Text>
        <Text style={styles.detail}>{item.room}</Text>
        <Text style={styles.teacher}>{item.teacher}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginBottom: 15 },
  timeColumn: { width: 60, alignItems: "center", paddingTop: 10 },
  startTime: { fontSize: 16, fontWeight: "bold", color: "#333" },
  endTime: { fontSize: 14, color: "#F28C28", marginTop: 5 },
  card: {
    flex: 1,
    backgroundColor: "#0055A5",
    borderRadius: 15,
    padding: 15,
    marginLeft: 10,
  },
  subject: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  detail: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginBottom: 3 },
  teacher: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontStyle: "italic",
  },
});
