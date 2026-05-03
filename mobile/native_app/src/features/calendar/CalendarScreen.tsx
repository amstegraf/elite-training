import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { AppHeader } from "../../ui/AppHeader";
import { colors } from "../../core/theme/theme";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react-native";
import { useAppState } from "../../data/AppStateContext";
import { currentTrainingStreak, monthHeatmapData } from "../../domain/metrics";

export function CalendarScreen() {
  const { completedSessions } = useAppState();
  const [monthAnchor, setMonthAnchor] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const month = monthHeatmapData(completedSessions, monthAnchor);
  const offset = month.offset;
  const days = month.daysInMonth;
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const totalDays = month.totalDaysTrained;
  const totalSessions = month.totalSessions;
  const streak = currentTrainingStreak(completedSessions);

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
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          >
            <ChevronLeft size={18} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {month.monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </Text>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          >
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
              <Text style={styles.summaryValue}>{streak}</Text>
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
              const count = month.counts[d] ?? 0;
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
