// src/components/schedule/SubjectPickerModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBuildings, getRooms, searchTeachers } from "../../api/schedule";
import type { Building, Group, Room, Teacher } from "../../api/types";
import { spacing } from "../../constants/theme";
import type { ScheduleSubject } from "../../types/schedule";
import { describeRequestError, getErrorSummary } from "../../utils/apiError";
import {
  makeGroupSubject,
  makeRoomSubject,
  makeTeacherSubject,
} from "../../utils/subjects";

const TABS = [
  { key: "group", label: "Группа" },
  { key: "teacher", label: "Преподаватели" },
  { key: "room", label: "Аудитории" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function buildingLabel(building: Building): string {
  if (!building.building) return "Без корпуса";
  if (building.building === "-") return "Прочее";
  return building.building;
}

type Props = {
  visible: boolean;
  active: ScheduleSubject | null;
  group: Group | null;
  onClose: () => void;
  onSelect: (subject: ScheduleSubject) => void;
};

export function SubjectPickerModal({
  visible,
  active,
  group,
  onClose,
  onSelect,
}: Props) {
  const [tab, setTab] = useState<TabKey>(active?.kind ?? "group");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setTab(active?.kind ?? "group");
    }
  }, [visible, active?.kind]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleWrap}>
              <Text style={styles.sheetTitle}>Расписание для</Text>
              <Text style={styles.sheetCurrent} numberOfLines={1}>
                {active?.title ?? "не выбрано"}
              </Text>
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

          <View style={styles.tabs}>
            {TABS.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                style={[styles.tab, tab === item.key && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === item.key && styles.tabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.content}>
            {tab === "group" ? (
              <GroupTab
                group={group}
                active={active}
                onClose={onClose}
                onSelect={onSelect}
              />
            ) : tab === "teacher" ? (
              <TeacherTab active={active} onSelect={onSelect} />
            ) : (
              <RoomTab active={active} onSelect={onSelect} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type GroupTabProps = {
  group: Group | null;
  active: ScheduleSubject | null;
  onClose: () => void;
  onSelect: (subject: ScheduleSubject) => void;
};

function GroupTab({ group, active, onClose, onSelect }: GroupTabProps) {
  const router = useRouter();

  const goToProfile = () => {
    onClose();
    router.navigate("/profile");
  };

  if (!group) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Группа не выбрана</Text>
        <Text style={styles.emptyText}>
          Выберите факультет, курс и группу в профиле.
        </Text>
        <Pressable
          onPress={goToProfile}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryText}>Перейти в профиль</Text>
        </Pressable>
      </View>
    );
  }

  const isActive = active?.kind === "group" && active.uid === group.UID;

  return (
    <View>
      <Text style={styles.groupName}>{group.group}</Text>
      {group.speciality ? (
        <Text style={styles.groupSpeciality}>{group.speciality}</Text>
      ) : null}

      <Pressable
        onPress={() => onSelect(makeGroupSubject(group))}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.primaryText}>
          {isActive ? "Показать расписание" : "Выбрать эту группу"}
        </Text>
      </Pressable>

      <Pressable onPress={goToProfile} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Изменить группу в профиле</Text>
      </Pressable>
    </View>
  );
}

type SubjectTabProps = {
  active: ScheduleSubject | null;
  onSelect: (subject: ScheduleSubject) => void;
};

function TeacherTab({ active, onSelect }: SubjectTabProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    let isActive = true;
    setLoading(true);

    const timer = setTimeout(() => {
      searchTeachers(trimmed)
        .then((res) => {
          if (!isActive) return;
          setResults(res.teachers);
          setError(null);
        })
        .catch((err) => {
          if (!isActive) return;
          console.warn(
            "[subject-picker] teachers search failed",
            getErrorSummary(err),
          );
          setResults([]);
          setError(
            describeRequestError(err, "Не удалось найти преподавателей"),
          );
        })
        .finally(() => {
          if (isActive) setLoading(false);
        });
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [trimmed]);

  return (
    <View style={styles.tabBody}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Фамилия или ФИО"
        placeholderTextColor="#999"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        returnKeyType="search"
      />

      {trimmed.length < 2 ? (
        <Text style={styles.hint}>Введите минимум 2 символа</Text>
      ) : loading ? (
        <ActivityIndicator color="#0055A5" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.UID}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Ничего не найдено</Text>
          }
          renderItem={({ item }) => {
            const isActive =
              active?.kind === "teacher" && active.uid === item.UID;
            return (
              <Pressable
                onPress={() => onSelect(makeTeacherSubject(item))}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.teacher}
                  </Text>
                </View>
                {isActive ? (
                  <Ionicons name="checkmark" size={18} color="#0055A5" />
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

function RoomTab({ active, onSelect }: SubjectTabProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null,
  );
  const [rooms, setRooms] = useState<Room[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestSeq = useRef(0);

  useEffect(() => {
    let isActive = true;
    setLoading(true);

    getBuildings()
      .then((res) => {
        if (!isActive) return;
        setBuildings(res.buildings);
        setError(null);
      })
      .catch((err) => {
        if (!isActive) return;
        console.warn(
          "[subject-picker] buildings load failed",
          getErrorSummary(err),
        );
        setError(describeRequestError(err, "Не удалось загрузить корпуса"));
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const openBuilding = async (building: Building) => {
    const seq = ++requestSeq.current;
    setSelectedBuilding(building);
    setRooms([]);
    setQuery("");
    setError(null);
    setLoading(true);

    try {
      const res = await getRooms(building.bui_id);
      if (seq !== requestSeq.current) return;
      setRooms(res.rooms.filter((room) => room.room && room.room !== "-"));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.warn(
        "[subject-picker] rooms load failed",
        getErrorSummary(err),
      );
      setError(describeRequestError(err, "Не удалось загрузить аудитории"));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  const goBack = () => {
    requestSeq.current += 1;
    setSelectedBuilding(null);
    setRooms([]);
    setQuery("");
    setError(null);
    setLoading(false);
  };

  const filteredRooms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rooms;
    return rooms.filter((room) =>
      room.room.toLowerCase().includes(normalized),
    );
  }, [rooms, query]);

  if (selectedBuilding) {
    const buildingName = buildingLabel(selectedBuilding);

    return (
      <View style={styles.tabBody}>
        <View style={styles.buildingHeader}>
          <Pressable
            onPress={goBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Все корпуса"
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={18} color="#0055A5" />
            <Text style={styles.backText}>Все корпуса</Text>
          </Pressable>
          <Text style={styles.buildingTitle} numberOfLines={1}>
            {buildingName}
          </Text>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск аудитории"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        {loading ? (
          <ActivityIndicator color="#0055A5" style={styles.loader} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <FlatList
            data={filteredRooms}
            keyExtractor={(item) => String(item.room_id)}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Аудитории не найдены</Text>
            }
            renderItem={({ item }) => {
              const isActive =
                active?.kind === "room" && active.roomId === item.room_id;
              return (
                <Pressable
                  onPress={() => onSelect(makeRoomSubject(item, buildingName))}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.room}
                    </Text>
                    {item.room_type && item.room_type !== "-" ? (
                      <Text style={styles.rowSubtitle}>{item.room_type}</Text>
                    ) : null}
                  </View>
                  {isActive ? (
                    <Ionicons name="checkmark" size={18} color="#0055A5" />
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.tabBody}>
      {loading ? (
        <ActivityIndicator color="#0055A5" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={buildings}
          keyExtractor={(item) => String(item.bui_id)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Корпуса не найдены</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openBuilding(item)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {buildingLabel(item)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
            </Pressable>
          )}
        />
      )}
    </View>
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
    height: "82%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sheetTitleWrap: { flex: 1, paddingRight: 12 },
  sheetTitle: { fontSize: 13, color: "#888" },
  sheetCurrent: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 2,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#F0F2F5",
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "white" },
  tabText: { fontSize: 12, color: "#666", fontWeight: "600" },
  tabTextActive: { color: "#0055A5" },
  content: { flex: 1, paddingTop: 12 },
  tabBody: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#333",
  },
  hint: {
    color: "#888",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  loader: { marginTop: 24, alignSelf: "center" },
  error: {
    color: "#B00020",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  list: { flex: 1, marginTop: 8 },
  listContent: { paddingBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  rowText: { flex: 1, paddingRight: 8 },
  rowTitle: { fontSize: 15, color: "#333" },
  rowSubtitle: { fontSize: 12, color: "#888", marginTop: 2 },
  pressed: { opacity: 0.7 },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  emptyText: { fontSize: 13, color: "#888", textAlign: "center" },
  primaryButton: {
    backgroundColor: "#0055A5",
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 20,
  },
  primaryText: { color: "white", fontSize: 15, fontWeight: "600" },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  secondaryText: { color: "#0055A5", fontSize: 14, fontWeight: "600" },
  groupName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
  },
  groupSpeciality: {
    fontSize: 13,
    color: "#777",
    marginTop: 6,
    lineHeight: 18,
  },
  buildingHeader: { marginBottom: 4 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  backText: { color: "#0055A5", fontSize: 13, fontWeight: "600" },
  buildingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 2,
    marginBottom: 8,
  },
});
