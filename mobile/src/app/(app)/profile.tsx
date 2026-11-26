// app/(app)/profile.tsx
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
import { colors, radii, spacing } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useProfileSelection } from "../../hooks/useProfileSelection";
import { clearScheduleCache } from "../../utils/scheduleCache";
import { clearProfileSelection } from "../../utils/storage";

type ModalType = "faculty" | "course" | "group" | null;

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

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Text style={styles.headerTitle}>Ваш профиль</Text>
        </View>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>Ваш профиль</Text>
      </View>

      <View style={styles.content}>
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => void reload()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.retryText}>Повторить</Text>
            </Pressable>
          </View>
        ) : null}

        <InfoCard title="Основная информация">
          <InfoRow
            label="Полное имя"
            value={user?.displayName || "Неизвестно"}
          />
          {user?.email ? (
            <>
              <Divider />
              <InfoRow label="Email" value={user.email} />
            </>
          ) : null}
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
            onPress={() => router.push("/about")}
          />
        </InfoCard>

        <LogoutButton onPress={handleLogout} loading={isSigningOut} />
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: { color: colors.onPrimary, fontSize: 20, fontWeight: "bold" },
  content: { padding: spacing.lg },
  errorCard: {
    backgroundColor: "#FDECEE",
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  retryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  pressed: { opacity: 0.7 },
});
