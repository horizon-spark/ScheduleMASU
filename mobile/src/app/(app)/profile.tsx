import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [group, setGroup] = useState("БПМИ-УДМО-21");
  const [tempGroup, setTempGroup] = useState(group);

  const handleEdit = () => {
    setTempGroup(group);
    setIsEditing(true);
  };

  const handleSave = () => {
    setGroup(tempGroup);
    setIsEditing(false);
  };

  const handleCancel = () => setIsEditing(false);

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ваш профиль</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.lkButton}>
          <Text style={styles.lkButtonText}>Личный кабинет</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Основная информация</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Полное имя</Text>
            <Text style={styles.value}>Денис Иванович Каравка</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Группа</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={tempGroup}
                onChangeText={setTempGroup}
                placeholder="Введите группу"
              />
            ) : (
              <Text style={styles.value}>{group}</Text>
            )}
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Номер зачетной книжки</Text>
            <Text style={styles.value}>Укажите номер зачетной книжки</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.actionText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.actionText}>Сохранить</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleEdit}
              >
                <Text style={styles.actionText}>Редактировать</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleLogout}
              >
                <Text style={styles.actionText}>Выйти</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
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
  lkButton: {
    backgroundColor: "#F28C28",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 20,
  },
  lkButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },
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
  input: {
    borderWidth: 1,
    borderColor: "#0055A5",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: "#333",
  },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 10 },
  actions: { flexDirection: "row", justifyContent: "space-between" },
  actionButton: {
    flex: 1,
    backgroundColor: "#0055A5",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: { backgroundColor: "#999" },
  saveButton: { backgroundColor: "#0055A5" },
  actionText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
