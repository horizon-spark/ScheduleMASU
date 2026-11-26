// src/constants/theme.ts
export const colors = {
  primary: "#0055A5",
  primaryPressed: "#004A90",
  primarySoft: "#EAF2FB",
  background: "#F4F6F8",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  text: "#1F2933",
  textSecondary: "#52606D",
  // Раньше был #888: на белом это ~3.5:1 и плохо читается в 11–12 px.
  textMuted: "#6B7280",
  border: "#DDE3E8",
  borderLight: "#EEF1F4",
  accent: "#B45309",
  accentSoft: "#FEF3E2",
  danger: "#B42318",
  dangerSoft: "#FDECEE",
  success: "#067647",
  successSoft: "#ECFDF3",
  warningBackground: "#FFF3CD",
  warningText: "#7A5B16",
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "rgba(255,255,255,0.75)",
  onPrimarySubtle: "rgba(255,255,255,0.85)",
  overlay: "rgba(15,23,42,0.45)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: "700" },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 21, fontWeight: "400" },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  captionStrong: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
  micro: { fontSize: 11, lineHeight: 15, fontWeight: "600" },
} as const;

export const shadows = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sheet: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
} as const;
