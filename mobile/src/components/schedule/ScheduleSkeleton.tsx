import { StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../../constants/theme";

const SKELETON_ROWS = [0, 1, 2, 3];

export function ScheduleSkeleton() {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Загрузка расписания"
      accessibilityState={{ busy: true }}
    >
      {SKELETON_ROWS.map((row) => (
        <View key={row} style={styles.row}>
          <View style={styles.time}>
            <View style={styles.timeLine} />
            <View style={styles.timeLineSmall} />
          </View>
          <View style={styles.card}>
            <View style={styles.titleLine} />
            <View style={styles.metaLine} />
            <View style={styles.shortLine} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: "row",
    marginBottom: spacing.sm + 2,
  },
  time: {
    width: 56,
    alignItems: "center",
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  timeLine: {
    width: 34,
    height: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  timeLineSmall: {
    width: 26,
    height: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.borderLight,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    padding: spacing.md,
    marginLeft: spacing.sm,
    gap: spacing.sm,
  },
  titleLine: {
    height: 14,
    width: "72%",
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  metaLine: {
    height: 10,
    width: "46%",
    borderRadius: radii.sm,
    backgroundColor: colors.borderLight,
  },
  shortLine: {
    height: 10,
    width: "34%",
    borderRadius: radii.sm,
    backgroundColor: colors.borderLight,
  },
});
