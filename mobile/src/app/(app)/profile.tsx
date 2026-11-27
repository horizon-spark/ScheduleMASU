// app/(app)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Divider, InfoCard, InfoRow } from "../../components/profile/InfoCard";
import { LogoutButton } from "../../components/profile/LogoutButton";
import { SelectionModal } from "../../components/profile/SelectionModal";
import { SettingRow } from "../../components/profile/SettingRow";
import {
  colors,
  radii,
  spacing,
  typography,
} from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useProfileSelection } from "../../hooks/useProfileSelection";
import { clearScheduleCache } from "../../utils/scheduleCache";
import { clearProfileSelection } from "../../utils/storage";

type ModalType = "faculty" | "course" | "group" | null;

function getInitials(name?: string | null, username?: string | null): string {
  const source = (name || username || "").trim();

  if (!source) return "МА";

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [modalType, setModalType] = useState<ModalType>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const handleLogout = () => {
    Alert.alert("Выход", "Вы уверены, что хотите выйти?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Выйти",
        style: "destructive",
        onPress: async () => {
          try {
            setIsSigningOut(true);
            await Promise.all([clearProfileSelection(), clearScheduleCache()]);
            await signOut();
            // router.replace не нужен — RootNavigator сделает редирект
            // при смене userToken на null
          } catch {
            Alert.alert("Ошибка", "Не удалось выйти");
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(user?.displayName, user?.username)}
          </Text>
        </View>
        <View style={styles.identityText}>
          <Text
            style={styles.name}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {user?.displayName || user?.username || "Пользователь"}
          </Text>
          <Text style={styles.identityMeta} numberOfLines={1}>
            {user?.email || user?.username || "Доменная учётная запись"}
          </Text>
          {selectedGroup ? (
            <View style={styles.groupChip}>
              <Ionicons
                name="people-outline"
                size={13}
                color={colors.onPrimary}
              />
              <Text style={styles.groupChipText} numberOfLines={1}>
                {selectedGroup.group}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {error ? (
          <View
            style={styles.errorCard}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => void reload()}
              accessibilityRole="button"
              accessibilityLabel="Повторить загрузку данных профиля"
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryText}>Повторить</Text>
            </Pressable>
          </View>
        ) : null}

        <InfoCard title="Учётная запись">
          <InfoRow label="Логин" value={user?.username || "Неизвестно"} />
          <Divider />
          <InfoRow
            label="Факультет"
            value={selectedFaculty?.facultee || "Не выбран"}
          />
          <Divider />
          <InfoRow
            label="Группа"
            value={selectedGroup?.group || "Не выбрана"}
          />
        </InfoCard>

        <InfoCard title="Настройка группы">
          <SettingRow
            label="Факультет"
            value={selectedFaculty?.facultee || "Выбрать"}
            onPress={() => setModalType("faculty")}
          />
          <SettingRow
            label="Курс"
            value={selectedCourse?.course || "Выбрать"}
            onPress={() => setModalType("course")}
          />
          <SettingRow
            label="Группа"
            value={
              selectedGroup?.group || (isLoading ? "Загрузка..." : "Выбрать")
            }
            onPress={() => setModalType("group")}
            disabled={!selectedFaculty || !selectedCourse || isLoading}
          />
        </InfoCard>

        <InfoCard title="Приложение">
          <SettingRow
            label="О приложении"
            value="Версия и поддержка"
            iconName="chevron-forward"
            stacked
            hint="Открыть информацию о приложении"
            onPress={() => router.push("/about")}
          />
        </InfoCard>

        <LogoutButton onPress={handleLogout} loading={isSigningOut} />
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
  identity: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.headline,
    color: colors.onPrimary,
  },
  identityText: { flex: 1 },
  name: {
    ...typography.title,
    color: colors.onPrimary,
  },
  identityMeta: {
    ...typography.caption,
    color: colors.onPrimarySubtle,
    marginTop: 2,
  },
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.sm,
  },
  groupChipText: {
    ...typography.micro,
    color: colors.onPrimary,
    flexShrink: 1,
  },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
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
  pressed: { opacity: 0.7 },
});
