// src/constants/theme.ts
export const colors = {
  primary: "#0055A5",
  primarySoft: "#EAF2FB",
  background: "#F5F5F5",
  surface: "#FFFFFF",
  text: "#333333",
  textSecondary: "#666666",
  textMuted: "#888888",
  border: "#E0E0E0",
  borderLight: "#EDEDED",
  accent: "#F28C28",
  danger: "#B00020",
  warningBackground: "#FFF3CD",
  warningText: "#8A6D3B",
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "rgba(255,255,255,0.75)",
  onPrimarySubtle: "rgba(255,255,255,0.85)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;
