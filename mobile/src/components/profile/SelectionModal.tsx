// src/components/profile/SelectionModal.tsx
import { Ionicons } from "@expo/vector-icons";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../constants/theme";

type Props<T> = {
  visible: boolean;
  title: string;
  data: T[];
  keyExtractor: (item: T) => string;
  renderLabel: (item: T) => string;
  onSelect: (item: T) => void;
  onClose: () => void;
};

export function SelectionModal<T>({
  visible,
  title,
  data,
  keyExtractor,
  renderLabel,
  onSelect,
  onClose,
}: Props<T>) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              style={({ pressed }) => [
                styles.close,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Список пуст</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.pressed,
                ]}
                onPress={() => onSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={renderLabel(item)}
              >
                <Text style={styles.itemText} numberOfLines={2}>
                  {renderLabel(item)}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
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
    backgroundColor: colors.overlay,
  },
  sheet: {
    maxHeight: "80%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    ...shadows.sheet,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.headline,
    flex: 1,
    color: colors.text,
  },
  close: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { flexShrink: 1 },
  listContent: { paddingBottom: spacing.sm },
  item: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemText: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    paddingRight: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  pressed: { opacity: 0.7 },
});
