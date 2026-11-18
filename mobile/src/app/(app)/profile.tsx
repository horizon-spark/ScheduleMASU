// app/(app)/profile.tsx
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Divider, InfoCard, InfoRow } from "../../components/profile/InfoCard";
import { LogoutButton } from "../../components/profile/LogoutButton";
import { SelectionModal } from "../../components/profile/SelectionModal";
import { SettingRow } from "../../components/profile/SettingRow";
import { useAuth } from "../../context/AuthContext";
import { useProfileSelection } from "../../hooks/useProfileSelection";
import { clearProfileSelection } from "../../utils/storage";

type ModalType = "faculty" | "course" | "group" | null;

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

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
            await clearProfileSelection();
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
      <ActivityIndicator size="large" color="#0055A5" style={{ flex: 1 }} />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ваш профиль</Text>
      </View>

      <View style={styles.content}>
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
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    backgroundColor: "#0055A5",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  content: { padding: 15 },
});
