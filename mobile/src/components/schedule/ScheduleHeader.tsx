// src/components/schedule/ScheduleHeader.tsx
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors,
  fontScaleCaps,
  fonts,
  spacing,
} from "../../constants/theme";
import type { ScheduleSubject } from "../../types/schedule";

type Props = {
  /** undefined — не показывать строку субъекта (начальная загрузка). */
  subject?: ScheduleSubject | null;
  onPressSubject?: () => void;
  onPressTeacher?: () => void;
  onPressRoom?: () => void;
};

export function ScheduleHeader({
  subject,
  onPressSubject,
  onPressTeacher,
  onPressRoom,
}: Props) {
  const insets = useSafeAreaInsets();
  const title = subject?.title ?? "Выбрать расписание";
  // Направление/роль не дублируем в шапке: у группы остаётся только код.
  // Подпись показываем лишь для аудитории — там это корпус.
  const subtitle = subject?.kind === "room" ? subject.subtitle : undefined;

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.headerRow}>
        <Image
          source={require("../../../assets/images/brand/logo-mark-white.png")}
          style={styles.brandMark}
          resizeMode="contain"
          accessibilityLabel="МАУ"
        />

        {subject !== undefined ? (
          <Pressable
            onPress={onPressSubject}
            disabled={!onPressSubject}
            accessibilityRole="button"
            accessibilityLabel={`Выбрать расписание. Сейчас: ${title}`}
            accessibilityHint="Открывает выбор группы, преподавателя или аудитории"
            style={({ pressed }) => [
              styles.subject,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.text}>
              <Text
                maxFontSizeMultiplier={fontScaleCaps.text}
                style={styles.title}
                numberOfLines={1}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  maxFontSizeMultiplier={fontScaleCaps.text}
                  style={styles.subtitle}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {onPressSubject ? (
              <Ionicons
                name="chevron-down"
                size={20}
                color={colors.onPrimaryMuted}
              />
            ) : null}
          </Pressable>
        ) : (
          <Text
            maxFontSizeMultiplier={fontScaleCaps.text}
            style={[styles.title, styles.text]}
            numberOfLines={1}
          >
            Расписание
          </Text>
        )}

        {subject !== undefined && (onPressTeacher || onPressRoom) ? (
          <View style={styles.actions}>
            {onPressTeacher ? (
              <Pressable
                onPress={onPressTeacher}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Выбрать расписание преподавателя"
                style={({ pressed }) => [
                  styles.action,
                  subject?.kind === "teacher" && styles.actionActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={
                    subject?.kind === "teacher"
                      ? colors.onPrimary
                      : colors.onPrimarySubtle
                  }
                />
              </Pressable>
            ) : null}
            {onPressRoom ? (
              <Pressable
                onPress={onPressRoom}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Выбрать расписание аудитории"
                style={({ pressed }) => [
                  styles.action,
                  subject?.kind === "room" && styles.actionActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={
                    subject?.kind === "room"
                      ? colors.onPrimary
                      : colors.onPrimarySubtle
                  }
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandMark: {
    width: 34,
    height: 15,
    marginRight: spacing.md,
  },
  subject: { flex: 1, flexDirection: "row", alignItems: "center" },
  actions: { flexDirection: "row", alignItems: "center" },
  action: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  actionActive: { backgroundColor: "rgba(255,255,255,0.16)" },
  text: { flex: 1, paddingRight: spacing.sm },
  title: {
    color: colors.onPrimary,
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 25,
  },
  subtitle: {
    color: colors.onPrimaryMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  pressed: { opacity: 0.7 },
});
