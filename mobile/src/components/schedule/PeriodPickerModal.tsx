// src/components/schedule/PeriodPickerModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  formatWeekRange,
  getMondayOfWeek,
  getSemesterWeeks,
  getWeekParity,
  isSameDay,
} from "../../constants/schedule";
import { colors, radii, spacing } from "../../constants/theme";

type Props = {
  visible: boolean;
  selectedWeek: Date;
  onClose: () => void;
  onSelect: (weekStart: Date) => void;
};

const ROW_HEIGHT = 56;

export function PeriodPickerModal({
  visible,
  selectedWeek,
  onClose,
  onSelect,
}: Props) {
  const weeks = useMemo(() => getSemesterWeeks(selectedWeek), [selectedWeek]);
  const currentWeek = getMondayOfWeek(new Date());
  const insets = useSafeAreaInsets();

  const selectedIndex = useMemo(() => {
    const index = weeks.findIndex((week) => isSameDay(week, selectedWeek));
    return index < 0 ? 0 : index;
  }, [weeks, selectedWeek]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        {visible ? (
          <View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + spacing.md },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>Выберите период</Text>
                <Pressable
                  onPress={() => onSelect(currentWeek)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Перейти к текущей неделе"
                  style={({ pressed }) => [
                    styles.todayButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="locate-outline"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.todayText}>Текущая неделя</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
                style={styles.close}
              >
                <Ionicons name="close" size={22} color="#333" />
              </Pressable>
            </View>

            <FlatList
              data={weeks}
              keyExtractor={(week) => formatWeekRange(week)}
              initialScrollIndex={Math.max(0, selectedIndex - 2)}
              getItemLayout={(_, index) => ({
                length: ROW_HEIGHT,
                offset: ROW_HEIGHT * index,
                index,
              })}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const selected = isSameDay(item, selectedWeek);
                return (
                  <Pressable
                    onPress={() => onSelect(item)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.row,
                      selected && styles.rowSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.rowText}>
                      <Text
                        style={[styles.range, selected && styles.rangeSelected]}
                      >
                        {formatWeekRange(item)}
                      </Text>
                      <Text
                        style={[
                          styles.parity,
                          selected && styles.paritySelected,
                        ]}
                      >
                        {getWeekParity(item)} неделя
                      </Text>
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark" size={20} color="#0055A5" />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    height: "72%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerText: { flex: 1, paddingRight: 12 },
  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    minHeight: 40,
  },
  todayText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { paddingBottom: 16 },
  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowSelected: { backgroundColor: "#EAF2FB" },
  rowText: { flex: 1, paddingRight: 8 },
  range: { fontSize: 15, fontWeight: "600", color: "#333" },
  rangeSelected: { color: "#0055A5" },
  parity: { fontSize: 12, color: "#888", marginTop: 2 },
  paritySelected: { color: "#0055A5" },
  pressed: { opacity: 0.7 },
});
