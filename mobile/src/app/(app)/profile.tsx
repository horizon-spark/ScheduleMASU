// app/(app)/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getCourses, getFaculties, getGroups } from "../../api/schedule";
import { Course, Faculty, Group } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import {
  clearProfileSelection,
  getSelectedCourse,
  getSelectedFaculty,
  getSelectedGroup,
  saveSelectedCourse,
  saveSelectedFaculty,
  saveSelectedGroup,
} from "../../utils/storage";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  // --- Данные для выбора ---
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // --- Выбранные значения ---
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // --- Модальные окна ---
  const [modalType, setModalType] = useState<
    "faculty" | "course" | "group" | null
  >(null);

  // --- Состояние загрузки ---
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // ============================================================
  // Инициализация: справочники + восстановление сохранённого выбора
  // ============================================================
  useEffect(() => {
    const init = async () => {
      try {
        setIsInitialLoading(true);

        const [facRes, courseRes, savedFaculty, savedCourse, savedGroup] =
          await Promise.all([
            getFaculties(),
            getCourses(),
            getSelectedFaculty(),
            getSelectedCourse(),
            getSelectedGroup(),
          ]);

        setFaculties(facRes.courses);
        setCourses(courseRes.courses);
        if (savedFaculty) setSelectedFaculty(savedFaculty);
        if (savedCourse) setSelectedCourse(savedCourse);
        if (savedGroup) setSelectedGroup(savedGroup);

        // Если есть сохранённые факультет и курс — подгружаем список групп,
        // чтобы модалка "Группа" была доступна сразу.
        if (savedFaculty && savedCourse) {
          const groupsRes = await getGroups(
            savedFaculty.fac_id,
            savedCourse.course_id,
          );
          setGroups(groupsRes.groups);
        }
      } catch (e) {
        Alert.alert("Ошибка", "Не удалось загрузить данные");
      } finally {
        setIsInitialLoading(false);
      }
    };
    init();
  }, []);

  // ============================================================
  // Загрузка групп
  // ============================================================
  const loadGroups = async (facId: number, courseId: number) => {
    try {
      setIsLoading(true);
      const res = await getGroups(facId, courseId);
      setGroups(res.groups);
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось загрузить группы");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // Обработчики выбора
  // ============================================================
  const handleFacultySelect = async (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setModalType(null);
    // Сброс зависимых значений
    setSelectedGroup(null);
    await saveSelectedGroup(null);

    if (selectedCourse) {
      await loadGroups(faculty.fac_id, selectedCourse.course_id);
    }
    await saveSelectedFaculty(faculty);
  };

  const handleCourseSelect = async (course: Course) => {
    setSelectedCourse(course);
    setModalType(null);
    // Сброс зависимых значений
    setSelectedGroup(null);
    await saveSelectedGroup(null);

    if (selectedFaculty) {
      await loadGroups(selectedFaculty.fac_id, course.course_id);
    }
    await saveSelectedCourse(course);
  };

  const handleGroupSelect = async (group: Group) => {
    setSelectedGroup(group);
    setModalType(null);
    await saveSelectedGroup(group);
    Alert.alert("Сохранено", `Группа ${group.group} выбрана`);
  };

  // ============================================================
  // Выход
  // ============================================================
  const handleLogout = () => {
    Alert.alert("Выход", "Вы уверены, что хотите выйти?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Выйти",
        style: "destructive",
        onPress: async () => {
          try {
            setIsSigningOut(true);
            await clearProfileSelection(); // факультет, курс, группа
            await signOut(); // токен + user в AuthContext
            // router.replace не нужен — RootNavigator сделает редирект
            // при смене userToken на null
          } catch (e) {
            Alert.alert("Ошибка", "Не удалось выйти");
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  // ============================================================
  // Модалка выбора
  // ============================================================
  const renderModal = () => {
    let data: any[] = [];
    let renderItem: any;
    let onSelect: any;

    if (modalType === "faculty") {
      data = faculties;
      renderItem = (item: Faculty) => item.facultee;
      onSelect = handleFacultySelect;
    } else if (modalType === "course") {
      data = courses;
      renderItem = (item: Course) => item.course;
      onSelect = handleCourseSelect;
    } else if (modalType === "group") {
      data = groups;
      renderItem = (item: Group) => item.group;
      onSelect = handleGroupSelect;
    }

    return (
      <Modal
        visible={modalType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModalType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === "faculty"
                ? "Выберите факультет"
                : modalType === "course"
                  ? "Выберите курс"
                  : "Выберите группу"}
            </Text>
            <FlatList
              data={data}
              keyExtractor={(item, index) =>
                `${item.fac_id ?? item.course_id ?? item.group_id ?? "item"}-${index}`
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => onSelect(item)}
                >
                  <Text style={styles.modalItemText}>{renderItem(item)}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
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
        {/* === Основная информация === */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Основная информация</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Полное имя</Text>
            <Text style={styles.value}>
              {user?.displayName || "Неизвестно"}
            </Text>
          </View>
          {user?.email ? (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{user.email}</Text>
              </View>
            </>
          ) : null}
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.label}>Группа</Text>
            <Text style={styles.value}>
              {selectedGroup?.group || "Не выбрана"}
            </Text>
          </View>
        </View>

        {/* === Настройка группы === */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Настройка группы</Text>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setModalType("faculty")}
          >
            <Text style={styles.filterLabel}>Факультет:</Text>
            <Text style={styles.filterValue}>
              {selectedFaculty?.facultee || "Выбрать"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#0055A5" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setModalType("course")}
          >
            <Text style={styles.filterLabel}>Курс:</Text>
            <Text style={styles.filterValue}>
              {selectedCourse?.course || "Выбрать"}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#0055A5" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setModalType("group")}
            disabled={!selectedFaculty || !selectedCourse || isLoading}
          >
            <Text style={styles.filterLabel}>Группа:</Text>
            <Text style={styles.filterValue}>
              {selectedGroup?.group || (isLoading ? "Загрузка..." : "Выбрать")}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#0055A5" />
          </TouchableOpacity>
        </View>

        {/* === Выход === */}
        <TouchableOpacity
          style={[styles.logoutButton, isSigningOut && { opacity: 0.6 }]}
          onPress={handleLogout}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionText}>Выйти</Text>
          )}
        </TouchableOpacity>
      </View>

      {renderModal()}
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
  infoCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  infoRow: { marginVertical: 5 },
  label: { fontSize: 14, color: "#666", marginBottom: 3 },
  value: { fontSize: 16, color: "#333", fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 10 },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  filterLabel: { fontSize: 14, color: "#666", width: 90 },
  filterValue: { flex: 1, fontSize: 16, color: "#333", fontWeight: "500" },
  logoutButton: {
    backgroundColor: "#0055A5",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  actionText: { color: "white", fontSize: 16, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    maxHeight: "70%",
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  modalItemText: { fontSize: 16, color: "#333" },
  modalClose: {
    backgroundColor: "#0055A5",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 15,
  },
  modalCloseText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
