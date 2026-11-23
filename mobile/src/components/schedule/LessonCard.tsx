// src/components/schedule/LessonCard.tsx
import { StyleSheet, Text, View } from "react-native";
import { Lesson } from "../../api/types";
import type { ScheduleSubjectKind } from "../../types/schedule";

function splitSlot(slot: string): { start: string; end?: string } {
  const [start, end] = slot.split(" - ");
  return { start: start?.trim() ?? slot, end: end?.trim() };
}

type Props = {
  item: Lesson;
  subjectKind: ScheduleSubjectKind;
};

export function LessonCard({ item, subjectKind }: Props) {
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
        {subjectKind !== "room" ? (
          <Text style={styles.detail}>{item.room}</Text>
        ) : null}
        {subjectKind !== "teacher" ? (
          <Text style={styles.teacher}>{item.teacher}</Text>
        ) : null}
        {item.subGroups.length > 0 ? (
          <Text style={styles.groups}>
            {subjectKind === "group" ? "Подгруппы" : "Группы"}:{" "}
            {item.subGroups.join(", ")}
          </Text>
        ) : null}
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
  groups: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 4,
  },
});
