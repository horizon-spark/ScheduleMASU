// src/components/schedule/ScheduleHeader.tsx
import { StyleSheet, Text, View } from "react-native";

type Props = { groupName?: string };

export function ScheduleHeader({ groupName }: Props) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Расписание</Text>
      {groupName ? <Text style={styles.groupLabel}>{groupName}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0055A5",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  title: { color: "white", fontSize: 20, fontWeight: "bold" },
  groupLabel: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 5 },
});
