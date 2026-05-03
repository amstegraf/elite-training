import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../core/theme/theme";

interface KpiCardProps {
  label: string;
  value: number | string;
  unit?: string;
  delta?: number;
  icon?: React.ElementType;
  tone?: "primary" | "accent" | "warning";
  size?: "md" | "lg";
}

export const KpiCard = ({ label, value, unit = "%", delta, icon: Icon, tone = "primary", size = "md" }: KpiCardProps) => {
  const isLg = size === "lg";
  
  const getToneColors = () => {
    switch (tone) {
      case "accent": return { bg: "rgba(247, 123, 29, 0.15)", text: colors.accent };
      case "warning": return { bg: "rgba(245, 166, 10, 0.15)", text: colors.warning };
      case "primary":
      default: return { bg: "rgba(26, 117, 80, 0.15)", text: colors.primary };
    }
  };

  const toneColors = getToneColors();

  return (
    <View style={styles.card}>
      <View style={[styles.glowCircle, { backgroundColor: toneColors.bg }]} />
      <View style={styles.content}>
        <View style={styles.leftCol}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, isLg && styles.valueLg]}>{value}</Text>
            <Text style={styles.unit}>{unit}</Text>
          </View>
          {delta !== undefined && (
            <View style={styles.deltaRow}>
              <Text style={[styles.deltaText, { color: delta >= 0 ? colors.primary : colors.danger }]}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
              </Text>
            </View>
          )}
        </View>
        {Icon && (
          <View style={[styles.iconContainer, { backgroundColor: toneColors.bg }]}>
            <Icon size={18} color={toneColors.text} strokeWidth={2.4} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.6)",
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  glowCircle: {
    position: "absolute",
    top: -32,
    right: -32,
    height: 96,
    width: 96,
    borderRadius: 48,
    opacity: 0.6,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  leftCol: {
    flexDirection: "column",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.6,
    color: colors.mutedForeground,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 4,
  },
  value: {
    fontSize: 30,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
  },
  valueLg: {
    fontSize: 36,
  },
  unit: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
  },
  deltaRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  deltaText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  iconContainer: {
    height: 40,
    width: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
