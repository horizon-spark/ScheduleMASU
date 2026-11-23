// src/components/schedule/ScheduleHeader.tsx
import { StyleSheet, Text, View } from "react-native";
import { formatUpdateTime } from "../../constants/schedule";

type Props = {
  groupName?: string;
  update?: string | null;
};

export function ScheduleHeader({ groupName, update }: Props) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Расписание</Text>
      {groupName ? <Text style={styles.groupLabel}>{groupName}</Text> : null}
      {update ? (
        <Text style={styles.update}>
          Обновлено: {formatUpdateTime(update)}
        </Text>
      ) : null}
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
  update: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 },
});
