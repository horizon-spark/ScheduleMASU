import * as SplashScreen from "expo-splash-screen";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../constants/theme";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Ловит ошибки рендера, чтобы вместо белого/красного экрана показать
 * пользователю понятный fallback. Ошибки событий и промисов сюда не попадают.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Если ошибка случилась до монтирования RootNavigator, splash может
    // остаться на экране навсегда — показываем fallback.
    SplashScreen.hideAsync().catch(() => {});
    console.error("[app] render error", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Что-то пошло не так</Text>
        <Text style={styles.text}>
          Приложение столкнулось с ошибкой. Попробуйте открыть экран ещё раз.
        </Text>
        <Pressable
          onPress={this.handleReset}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Попробовать снова</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 320,
  },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
    justifyContent: "center",
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  pressed: { opacity: 0.75 },
});
