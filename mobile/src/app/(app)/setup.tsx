import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SelectionModal } from "../../components/profile/SelectionModal";
import { SettingRow } from "../../components/profile/SettingRow";
import {
  colors,
  fonts,
  radii,
  spacing,
  typography,
} from "../../constants/theme";
import { useProfileSelection } from "../../hooks/useProfileSelection";

type ModalType = "faculty" | "course" | "group" | null;

export default function SetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [modalType, setModalType] = useState<ModalType>(null);

  const {
    faculties,
    courses,
    groups,
    selectedFaculty,
    selectedCourse,
    selectedGroup,
    isLoading,
    isInitialLoading,
    error,
    reload,
    selectFaculty,
    selectCourse,
    selectGroup,
  } = useProfileSelection(() => setModalType(null));

  const goToSchedule = () => router.replace("/(app)");

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Назад"
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.onPrimary} />
        <Text style={styles.backText}>Назад</Text>
      </Pressable>
      <Text style={styles.headerTitle}>Настройка расписания</Text>
      <Text style={styles.headerSubtitle}>Выберите группу</Text>
    </View>
  );

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        {header}
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Чтобы показывать расписание, нужно выбрать факультет, курс и группу.
          Это можно изменить позже в профиле.
        </Text>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => void reload()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryText}>Повторить</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <SettingRow
            label="Факультет"
            value={selectedFaculty?.facultee || "Выбрать"}
            onPress={() => setModalType("faculty")}
          />
          <SettingRow
            label="Курс"
            value={selectedCourse?.course || "Выбрать"}
            onPress={() => setModalType("course")}
            disabled={!selectedFaculty}
          />
          <SettingRow
            label="Группа"
            value={
              selectedGroup?.group || (isLoading ? "Загрузка..." : "Выбрать")
            }
            onPress={() => setModalType("group")}
            disabled={!selectedFaculty || !selectedCourse || isLoading}
          />
        </View>

        {selectedGroup ? (
          <View style={styles.success}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colors.success}
            />
            <Text style={styles.successText}>
              Группа {selectedGroup.group} выбрана
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={goToSchedule}
          disabled={!selectedGroup}
          accessibilityRole="button"
          accessibilityState={{ disabled: !selectedGroup }}
          style={({ pressed }) => [
            styles.primaryButton,
            !selectedGroup && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryText}>Перейти к расписанию</Text>
        </Pressable>

        <Pressable
          onPress={goToSchedule}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.skipButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.skipText}>
            Пропустить и выбрать преподавателя или аудиторию
          </Text>
        </Pressable>
      </ScrollView>

      <SelectionModal
        visible={modalType === "faculty"}
        title="Выберите факультет"
        data={faculties}
        keyExtractor={(f) => String(f.fac_id)}
        renderLabel={(f) => f.facultee}
        onSelect={selectFaculty}
        onClose={() => setModalType(null)}
      />

      <SelectionModal
        visible={modalType === "course"}
        title="Выберите курс"
        data={courses}
        keyExtractor={(c) => String(c.course_id)}
        renderLabel={(c) => c.course}
        onSelect={selectCourse}
        onClose={() => setModalType(null)}
      />

      <SelectionModal
        visible={modalType === "group"}
        title="Выберите группу"
        data={groups}
        keyExtractor={(g) => String(g.group_id)}
        renderLabel={(g) => g.group}
        onSelect={selectGroup}
        onClose={() => setModalType(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    minHeight: 32,
  },
  backText: {
    fontFamily: fonts.bodySemibold,
    color: colors.onPrimary,
    fontSize: 14,
    marginLeft: 2,
  },
  headerTitle: {
    ...typography.title,
    color: colors.onPrimary,
    marginTop: spacing.sm,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.onPrimarySubtle,
    marginTop: 2,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  intro: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
  retryButton: {
    alignSelf: "flex-start",
    minHeight: 40,
    justifyContent: "center",
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  retryText: {
    ...typography.captionStrong,
    color: colors.primary,
  },
  success: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  successText: {
    ...typography.caption,
    color: colors.success,
  },
  primaryButton: {
    marginTop: spacing.xl,
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  primaryText: {
    ...typography.bodyStrong,
    color: colors.onPrimary,
  },
  disabled: { opacity: 0.45 },
  skipButton: {
    marginTop: spacing.md,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  skipText: {
    ...typography.caption,
    color: colors.primary,
    textAlign: "center",
  },
  pressed: { opacity: 0.75 },
});
