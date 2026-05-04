import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { colors } from "../../core/theme/theme";
import { Calendar, Clock, Filter, Search, Target, ChevronRight, Trophy, TrendingDown, TrendingUp, Sparkles, Flame } from "lucide-react-native";
import { useAppState } from "../../data/AppStateContext";
import { completedSessionsSorted, computeSessionMetrics, currentTrainingStreak, formatDurationLabel } from "../../domain/metrics";
import { LinearGradient } from "expo-linear-gradient";

type HistoryFilter = "ALL" | "THIS WEEK" | "9-BALL" | "8-BALL" | "DRILL";
type HistoryGroup = "Today" | "Yesterday" | "This Week" | "Earlier";

type HistoryItem = {
  id: string;
  typeLabel: "8-BALL" | "9-BALL" | "10-BALL" | "DRILL";
  group: HistoryGroup;
  title: string;
  timeLabel: string;
  durationLabel: string;
  racks: number;
  pot: number;
  pos: number;
  rack: number;
  startedAtMs: number;
  best: boolean;
  sourceType: "session" | "drill";
  sourceId: string;
};

const FILTERS: HistoryFilter[] = ["ALL", "THIS WEEK", "9-BALL", "8-BALL", "DRILL"];

function getSessionGroup(ts: number): HistoryGroup {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const yesterday = today - dayMs;
  const weekAgo = today - dayMs * 7;

  if (ts >= today) return "Today";
  if (ts >= yesterday) return "Yesterday";
  if (ts >= weekAgo) return "This Week";
  return "Earlier";
}

export function SessionHistoryScreen() {
  const nav = useNavigation<any>();
  const { completedSessions, drillResults } = useAppState();
  const [filter, setFilter] = useState<HistoryFilter>("ALL");
  const [query, setQuery] = useState("");

  const sortedSessions = useMemo(() => completedSessionsSorted(completedSessions), [completedSessions]);

  const items = useMemo<HistoryItem[]>(() => {
    const sessionRows = sortedSessions.map((s) => {
      const metrics = computeSessionMetrics(s);
      const dt = new Date(s.startedAt);
      const startedAtMs = dt.getTime();
      const pot = Math.round((metrics.potRate ?? 0) * 100);
      const pos = Math.round((metrics.positionRate ?? 0) * 100);
      const rack = Math.round((metrics.rackConversionRate ?? 0) * 100);
      const typeLabel = `${s.ballCount}-BALL` as "8-BALL" | "9-BALL" | "10-BALL";
      const title = getSessionGroup(startedAtMs) === "Today" ? "Today" : dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      return {
        id: `session-${s.id}`,
        typeLabel,
        group: getSessionGroup(startedAtMs),
        title,
        timeLabel: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationLabel: formatDurationLabel(metrics.durationSeconds),
        racks: metrics.totalRacks,
        pot,
        pos,
        rack,
        startedAtMs,
        best: false,
        sourceType: "session" as const,
        sourceId: s.id,
      };
    });

    const bestSession = sessionRows.reduce<HistoryItem | null>((best, item) => {
      if (!best) return item;
      if (item.pot > best.pot) return item;
      return best;
    }, null);

    const drillRows = drillResults.map((run) => {
      const dt = new Date(run.finishedAt);
      const startedAtMs = dt.getTime();
      const pos = Math.round((run.stars / 3) * 100);
      return {
        id: `drill-${run.id}`,
        typeLabel: "DRILL" as const,
        group: getSessionGroup(startedAtMs),
        title: run.drillName,
        timeLabel: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationLabel: formatDurationLabel(run.durationSeconds),
        racks: run.attempts,
        pot: run.successPct,
        pos,
        rack: run.completed > 0 ? 100 : 0,
        startedAtMs,
        best: run.stars === 3,
        sourceType: "drill" as const,
        sourceId: run.drillId,
      };
    });

    return [...sessionRows, ...drillRows]
      .map((item) => ({
        ...item,
        best: item.best || (bestSession?.id === item.id && item.sourceType === "session"),
      }))
      .sort((a, b) => b.startedAtMs - a.startedAtMs);
  }, [drillResults, sortedSessions]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "THIS WEEK" && !["Today", "Yesterday", "This Week"].includes(item.group)) return false;
      if (filter !== "ALL" && filter !== "THIS WEEK" && item.typeLabel !== filter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.typeLabel.toLowerCase().includes(q) ||
        item.timeLabel.toLowerCase().includes(q)
      );
    });
  }, [filter, items, query]);

  const groups = useMemo(() => {
    const order: HistoryGroup[] = ["Today", "Yesterday", "This Week", "Earlier"];
    return order
      .map((group) => ({ group, items: filteredItems.filter((item) => item.group === group) }))
      .filter((section) => section.items.length > 0);
  }, [filteredItems]);

  const stats = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const inLast30 = sortedSessions.filter((session) => new Date(session.startedAt).getTime() >= cutoff);
    const source = inLast30.length > 0 ? inLast30 : sortedSessions;
    const total = source.length;
    const avgPot =
      total > 0
        ? Math.round(
            source.reduce((sum, s) => {
              const pot = computeSessionMetrics(s).potRate ?? 0;
              return sum + pot * 100;
            }, 0) / total
          )
        : 0;
    const racks = source.reduce((sum, s) => sum + computeSessionMetrics(s).totalRacks, 0);
    const newest = source[0] ? Math.round((computeSessionMetrics(source[0]).potRate ?? 0) * 100) : 0;
    const previous = source[1] ? Math.round((computeSessionMetrics(source[1]).potRate ?? 0) * 100) : newest;
    const trend = newest - previous;
    const streak = currentTrainingStreak(completedSessions);
    return { total, avgPot, racks, trend, streak };
  }, [completedSessions, sortedSessions]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="History"
        subtitle="Training log"
        right={
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
            <Filter size={18} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["rgba(42, 181, 131, 0.14)", "rgba(255, 209, 140, 0.12)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <Calendar size={24} color={colors.primaryForeground} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroKicker}>Last 30 days</Text>
              <Text style={styles.heroHeadline}>
                {stats.total} <Text style={styles.heroHeadlineUnit}>sessions</Text>
              </Text>
              <View style={styles.streakRow}>
                <Sparkles size={11} color={colors.tierGold} />
                <Text style={styles.streakText}>Best streak: {Math.max(0, stats.streak)} days</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroMiniGrid}>
            <HeroMiniStat label="Avg pot" value={`${stats.avgPot}%`} icon={<Target size={15} color={colors.tierGold} />} />
            <HeroMiniStat label="Racks" value={`${stats.racks}`} icon={<Trophy size={15} color={colors.primary} />} />
            <HeroMiniStat
              label="Trend"
              value={`${stats.trend >= 0 ? "+" : ""}${stats.trend}%`}
              icon={stats.trend >= 0 ? <TrendingUp size={15} color={colors.primary} /> : <TrendingDown size={15} color={colors.danger} />}
            />
          </View>
        </LinearGradient>

        <View style={styles.searchWrap}>
          <Search size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholder="Search by date or game type..."
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {FILTERS.map((option) => {
            const active = filter === option;
            return (
              <TouchableOpacity key={option} style={[styles.filterChip, active && styles.filterChipActive]} activeOpacity={0.9} onPress={() => setFilter(option)}>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.groupList}>
          {groups.map((group) => (
            <View key={group.group} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.group}</Text>
                <Text style={styles.groupCount}>
                  {group.items.length} session{group.items.length === 1 ? "" : "s"}
                </Text>
              </View>
              <View style={styles.cardsList}>
                {group.items.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.card, item.best && styles.cardBest]}
                    activeOpacity={0.9}
                    onPress={() =>
                      item.sourceType === "session"
                        ? nav.navigate("Report", { sessionId: item.sourceId })
                        : nav.navigate("DrillDetail", { drillId: item.sourceId })
                    }
                  >
                    {item.best ? (
                      <View style={styles.bestBadge}>
                        <Flame size={11} color={colors.tierGold} />
                        <Text style={styles.bestBadgeText}>Best</Text>
                      </View>
                    ) : null}
                    <View style={styles.cardTopRow}>
                      <View style={styles.iconContainer}>
                        <Target size={20} color={colors.primary} />
                      </View>
                      <View style={styles.cardBody}>
                        <View style={styles.metaTopRow}>
                          <View style={styles.typePill}>
                            <Text style={styles.typePillText}>{item.typeLabel}</Text>
                          </View>
                          <View style={styles.durationMeta}>
                            <Clock size={10} color={colors.mutedForeground} />
                            <Text style={styles.durationText}>{item.durationLabel}</Text>
                          </View>
                        </View>
                        <Text style={styles.dateText} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.metaText}>
                          {item.timeLabel} · {item.racks} {item.typeLabel === "DRILL" ? "attempts" : "racks"}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={colors.mutedForeground} />
                    </View>
                    <View style={styles.statsGrid}>
                      <MiniStat label="Pot" value={item.pot} />
                      <MiniStat label="Pos" value={item.pos} />
                      <MiniStat label="Rack" value={item.rack} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {groups.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No sessions found</Text>
              <Text style={styles.emptyBody}>Try another filter or search term.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function HeroMiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <View style={styles.heroMiniCard}>
      {icon}
      <Text style={styles.heroMiniValue}>{value}</Text>
      <Text style={styles.heroMiniLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  const accent =
    value >= 80 ? colors.primary : value >= 65 ? colors.tierGold : value >= 50 ? colors.accent : colors.danger;
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>
        {value}
        <Text style={styles.miniUnit}>%</Text>
      </Text>
      <View style={styles.miniTrack}>
        <View style={[styles.miniFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: accent }]} />
      </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 14,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(53, 121, 89, 0.24)",
    padding: 16,
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIconWrap: {
    height: 54,
    width: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroKicker: {
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 12,
    color: colors.primary,
    fontFamily: "Inter_700Bold",
  },
  heroHeadline: {
    marginTop: 2,
    fontSize: 34,
    lineHeight: 34,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  heroHeadlineUnit: {
    fontSize: 24,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  streakRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakText: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  heroMiniGrid: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  heroMiniCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.7)",
    backgroundColor: "rgba(250, 248, 244, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 4,
  },
  heroMiniValue: {
    fontSize: 22,
    color: colors.foreground,
    lineHeight: 24,
    fontFamily: "Sora_700Bold",
  },
  heroMiniLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontFamily: "Inter_700Bold",
  },
  searchWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.9)",
    backgroundColor: colors.secondary,
    paddingHorizontal: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: 17,
    fontFamily: "Inter_500Medium",
  },
  filtersScroll: {
    gap: 8,
  },
  filterChip: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.8)",
    backgroundColor: "rgba(235, 232, 225, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterChipText: {
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  filterChipTextActive: {
    color: colors.primaryForeground,
  },
  groupList: {
    gap: 16,
  },
  groupSection: {
    gap: 8,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  groupTitle: {
    textTransform: "uppercase",
    letterSpacing: 2.1,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#55627B",
  },
  groupCount: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  cardsList: {
    gap: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.8)",
  },
  cardBest: {
    borderColor: "rgba(244, 190, 77, 0.7)",
  },
  bestBadge: {
    position: "absolute",
    top: 10,
    right: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(244, 190, 77, 0.45)",
    backgroundColor: "rgba(244, 190, 77, 0.16)",
    paddingHorizontal: 8,
    height: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bestBadgeText: {
    textTransform: "uppercase",
    color: "#cc8600",
    fontSize: 11,
    letterSpacing: 0.6,
    fontFamily: "Inter_700Bold",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardBody: {
    flex: 1,
    paddingRight: 6,
  },
  metaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typePill: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(204, 201, 196, 0.9)",
    backgroundColor: "rgba(237, 234, 228, 0.7)",
    paddingHorizontal: 6,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  typePillText: {
    fontSize: 9,
    color: "#6c7486",
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
  },
  durationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  iconContainer: {
    height: 48,
    width: 48,
    borderRadius: 16,
    backgroundColor: "rgba(26, 117, 80, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    marginTop: 3,
    fontSize: 26,
    lineHeight: 28,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  metaText: {
    marginTop: 2,
    fontSize: 15,
    color: "#4f617f",
    fontFamily: "Inter_500Medium",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  miniStat: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "rgba(235, 232, 225, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.88)",
    paddingVertical: 7,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  miniLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: colors.mutedForeground,
    fontFamily: "Inter_700Bold",
  },
  miniValue: {
    marginTop: 2,
    fontSize: 22,
    lineHeight: 24,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  miniUnit: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: colors.mutedForeground,
  },
  miniTrack: {
    marginTop: 6,
    width: "100%",
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(145, 148, 158, 0.22)",
  },
  miniFill: {
    height: "100%",
    borderRadius: 999,
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(198, 195, 190, 0.9)",
    borderRadius: 18,
    backgroundColor: "rgba(250, 248, 244, 0.6)",
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyTitle: {
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
    fontSize: 18,
  },
  emptyBody: {
    marginTop: 4,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
