import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { Chip } from "../../ui/Chip";
import { colors } from "../../core/theme/theme";
import { Filter, Target, ChevronRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import { useAppState } from "../../data/AppStateContext";
import { completedSessionsSorted, computeSessionMetrics, formatDurationLabel } from "../../domain/metrics";

export function SessionHistoryScreen() {
  const nav = useNavigation<any>();
  const { completedSessions } = useAppState();
  const [filter, setFilter] = useState<"all" | "week" | "month">("all");
  const sorted = completedSessionsSorted(completedSessions);
  const sessions = useMemo(() => {
    if (filter === "all") return sorted;
    const now = Date.now();
    const days = filter === "week" ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return sorted.filter((s) => new Date(s.startedAt).getTime() >= cutoff);
  }, [filter, sorted]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="History"
        subtitle="All sessions"
        right={
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
            <Filter size={18} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {[
            { key: "all", label: "All" },
            { key: "week", label: "This Week" },
            { key: "month", label: "This Month" },
          ].map((f) => (
            <View key={f.key} style={{ marginRight: 8 }}>
              <Chip label={f.label} active={filter === f.key} onPress={() => setFilter(f.key as "all" | "week" | "month")} />
            </View>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listScroll} showsVerticalScrollIndicator={false}>
        {sessions.map((s) => {
          const d = computeSessionMetrics(s);
          const dt = new Date(s.startedAt);
          const date = dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
          const time = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const pot = Math.round((d.potRate ?? 0) * 100);
          const pos = Math.round((d.positionRate ?? 0) * 100);
          const rack = Math.round((d.rackConversionRate ?? 0) * 100);
          return (
          <TouchableOpacity
            key={s.id}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => nav.navigate("Report", { sessionId: s.id })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <View style={styles.iconContainer}>
                  <Target size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.dateText}>{date}</Text>
                  <Text style={styles.metaText}>{time} · {formatDurationLabel(d.durationSeconds)} · {d.totalRacks} racks</Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.miniStat}>
                <Text style={styles.miniLabel}>POT</Text>
                <Text style={styles.miniValue}>{pot}<Text style={styles.miniUnit}>%</Text></Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniLabel}>POS</Text>
                <Text style={styles.miniValue}>{pos}<Text style={styles.miniUnit}>%</Text></Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniLabel}>RACK</Text>
                <Text style={styles.miniValue}>{rack}<Text style={styles.miniUnit}>%</Text></Text>
              </View>
            </View>
          </TouchableOpacity>
        );})}
        {sessions.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.metaText}>No sessions for this filter.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterButton: {
    height: 40,
    width: 40,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersScroll: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  listScroll: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 8,
  },
  card: {
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    height: 48,
    width: 48,
    borderRadius: 16,
    backgroundColor: "rgba(26, 117, 80, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  miniStat: {
    flex: 1,
    backgroundColor: "rgba(235, 232, 225, 0.6)",
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.muted,
  },
  miniValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  miniUnit: {
    fontSize: 10,
    color: colors.muted,
  },
});
