// src/components/schedule/DayTabs.tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DAYS_SHORT, WEEKDAYS_COUNT } from "../../constants/schedule";

type Props = {
  currentPage: number;
  onSelect: (index: number) => void;
};

export function DayTabs({ currentPage, onSelect }: Props) {
  return (
    <View style={styles.container}>
      {DAYS_SHORT.slice(0, WEEKDAYS_COUNT).map((day, i) => (
        <Pressable
          key={day}
          style={({ pressed }) => [
            styles.tab,
            currentPage === i && styles.tabActive,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => onSelect(i)}
        >
          <Text style={[styles.text, currentPage === i && styles.textActive]}>
            {day}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tab: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 20 },
  tabActive: { backgroundColor: "#0055A5" },
  text: { fontSize: 14, fontWeight: "bold", color: "#333" },
  textActive: { color: "white" },
});
