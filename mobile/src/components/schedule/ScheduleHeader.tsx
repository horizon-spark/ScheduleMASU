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
};

export function ScheduleHeader({ subject, onPressSubject }: Props) {
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

        {subject !== undefined && onPressSubject ? (
          <Pressable
            onPress={onPressSubject}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Выбрать расписание"
            accessibilityHint="Открывает выбор группы, преподавателя или аудитории"
            style={({ pressed }) => [
              styles.action,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={21}
              color={colors.onPrimary}
            />
          </Pressable>
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
  action: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
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
