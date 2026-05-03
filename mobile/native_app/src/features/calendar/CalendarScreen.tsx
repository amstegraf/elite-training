import React, { useMemo } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { colors } from "../../core/theme/theme";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react-native";

// pseudo-random training data for May 2026
const data: Record<number, number> = {
  1: 1, 2: 3, 4: 2, 5: 4, 6: 1, 8: 2, 9: 3,
  11: 1, 12: 2, 14: 4, 15: 3, 18: 2, 19: 1, 20: 3,
  22: 5, 23: 2, 25: 1, 26: 3, 28: 2, 29: 4, 30: 2,
};

export function CalendarScreen() {
  const nav = useNavigation<any>();

  // Build May 2026 — starts Friday (offset 5)
  const offset = 5;
  const days = 31;
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const totalDays = Object.keys(data).length;
  const totalSessions = Object.values(data).reduce((a, b) => a + b, 0);

  const getIntensityStyle = (n?: number) => {
    if (!n) return { bg: "rgba(235, 232, 225, 0.6)", text: colors.mutedForeground };
    if (n === 1) return { bg: "rgba(26, 117, 80, 0.2)", text: colors.primary };
    if (n === 2) return { bg: "rgba(26, 117, 80, 0.4)", text: colors.primaryForeground };
    if (n === 3) return { bg: "rgba(26, 117, 80, 0.6)", text: colors.primaryForeground };
    if (n === 4) return { bg: "rgba(26, 117, 80, 0.8)", text: colors.primaryForeground };
    return { bg: colors.primary, text: colors.primaryForeground, shadow: true };
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Calendar" subtitle="Training heatmap" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navButton}>
            <ChevronLeft size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.monthText}>May 2026</Text>
          <TouchableOpacity style={styles.navButton}>
            <ChevronRight size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Stats summary */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Days</Text>
            <View style={styles.summaryValueRow}>
              <Text style={styles.summaryValue}>{totalDays}</Text>
              <Text style={styles.summarySuffix}>/{days}</Text>
            </View>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Sessions</Text>
            <View style={styles.summaryValueRow}>
              <Text style={styles.summaryValue}>{totalSessions}</Text>
            </View>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Streak</Text>
            <View style={styles.summaryValueRow}>
              <Flame size={14} color={colors.accent} />
              <Text style={styles.summaryValue}>12</Text>
            </View>
          </View>
        </View>

        {/* Heatmap */}
        <View style={styles.heatmapCard}>
          <View style={styles.daysHeader}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <Text key={i} style={styles.dayHeaderText}>{d}</Text>
            ))}
          </View>
          <View style={styles.heatmapGrid}>
            {cells.map((d, i) => {
              if (d === null) return <View key={i} style={styles.heatmapCellEmpty} />;
              const count = data[d];
              const intensity = getIntensityStyle(count);
              
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.8}
                  style={[
                    styles.heatmapCell,
                    { backgroundColor: intensity.bg },
                    intensity.shadow && styles.heatmapCellShadow
                  ]}
                >
                  <Text style={[styles.cellDateText, { color: intensity.text }]}>{d}</Text>
                  {count > 0 && (
                    <Text style={[styles.cellCountText, { color: intensity.text }]}>×{count}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <Text style={styles.legendText}>Less</Text>
            <View style={styles.legendDots}>
              <View style={[styles.legendDot, { backgroundColor: "rgba(235, 232, 225, 0.6)" }]} />
              <View style={[styles.legendDot, { backgroundColor: "rgba(26, 117, 80, 0.2)" }]} />
              <View style={[styles.legendDot, { backgroundColor: "rgba(26, 117, 80, 0.4)" }]} />
              <View style={[styles.legendDot, { backgroundColor: "rgba(26, 117, 80, 0.6)" }]} />
              <View style={[styles.legendDot, { backgroundColor: "rgba(26, 117, 80, 0.8)" }]} />
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            </View>
            <Text style={styles.legendText}>More</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navButton: {
    height: 40,
    width: 40,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  monthText: {
    fontSize: 20,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
  },
  summaryValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    gap: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
  },
  summarySuffix: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_600SemiBold",
    marginBottom: -6,
  },
  heatmapCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  daysHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayHeaderText: {
    width: "13%",
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
  },
  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 4,
  },
  heatmapCellEmpty: {
    width: "13%",
    aspectRatio: 1,
  },
  heatmapCell: {
    width: "13%",
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  heatmapCellShadow: {
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  cellDateText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  cellCountText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    opacity: 0.9,
    marginTop: 1,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  legendText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
  },
  legendDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    height: 12,
    width: 12,
    borderRadius: 4,
  },
});
