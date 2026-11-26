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
import { colors, fonts, radii, spacing } from "../../constants/theme";

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
            <View style={styles.handle} />
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
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <FlatList
              data={weeks}
              keyExtractor={(week) => formatWeekRange(week)}
              style={styles.list}
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
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
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
    backgroundColor: colors.overlay,
  },
  sheet: {
    height: "72%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerText: { flex: 1, paddingRight: 12 },
  title: {
    fontFamily: fonts.headingSemibold,
    fontSize: 18,
    lineHeight: 23,
    color: colors.text,
  },
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
    fontFamily: fonts.bodySemibold,
    color: colors.primary,
    fontSize: 13,
    marginLeft: spacing.xs,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 16 },
  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowSelected: { backgroundColor: colors.primarySoft },
  rowText: { flex: 1, paddingRight: 8 },
  range: {
    fontFamily: fonts.headingSemibold,
    fontSize: 15,
    color: colors.text,
  },
  rangeSelected: { color: colors.primary },
  parity: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  paritySelected: { color: colors.primary },
  pressed: { opacity: 0.7 },
});
