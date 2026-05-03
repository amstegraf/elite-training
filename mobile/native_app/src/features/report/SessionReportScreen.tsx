import React from "react";
import { Alert, StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { KpiCard } from "../../ui/KpiCard";
import { colors } from "../../core/theme/theme";
import { Target, MapPin, Trophy, Share2, ArrowUpRight, Clock } from "lucide-react-native";
import { useAppState } from "../../data/AppStateContext";
import { buildRackReportRows, completedSessionsSorted, computeSessionMetrics, formatDurationLabel } from "../../domain/metrics";

export function SessionReportScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { completedSessions, startSession, deleteSession } = useAppState();
  const sorted = completedSessionsSorted(completedSessions);
  const selected =
    sorted.find((s) => s.id === route.params?.sessionId) ??
    sorted[0] ??
    null;
  const metrics = selected ? computeSessionMetrics(selected) : null;
  const racks = selected ? buildRackReportRows(selected) : [];
  const score = metrics?.potRate === null || !metrics ? 0 : Math.round((metrics.potRate + (metrics.positionRate ?? 0) + (metrics.rackConversionRate ?? 0)) / 3 * 100);
  const sessionDate = selected
    ? new Date(selected.startedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "No session";
  const tierDeltaPts = Math.round((metrics?.rackConversionRate ?? 0) * 100);
  const handleNewSession = () => {
    const createdId = startSession();
    if (!createdId) return;
    nav.navigate("Session", { sessionId: createdId });
  };
  const handleDeleteSession = () => {
    if (!selected) return;
    Alert.alert(
      "Delete session",
      "Are you sure you want to delete this session? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteSession(selected.id);
            nav.navigate("HistoryTab");
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Session Report"
        subtitle={sessionDate}
        back
        right={
          <TouchableOpacity style={styles.shareButton} activeOpacity={0.8}>
            <Share2 size={18} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary Hero */}
        <View style={styles.section}>
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.heroRow}>
              <View>
                <Text style={styles.heroLabel}>Overall Score</Text>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreValue}>{score}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
                <View style={styles.timeRow}>
                  <Clock size={12} color="rgba(247, 245, 240, 0.7)" />
                  <Text style={styles.timeText}>
                    {metrics ? `${formatDurationLabel(metrics.durationSeconds)} · ${metrics.totalRacks} racks` : "No data"}
                  </Text>
                </View>
              </View>
              <View style={styles.heroRight}>
                <View style={styles.impactBadge}>
                  <ArrowUpRight size={12} color={colors.primaryGlow} />
                  <Text style={styles.impactBadgeText}>+{tierDeltaPts} pts</Text>
                </View>
                <Text style={styles.impactLabel}>Tier impact</Text>
                <Text style={styles.impactValue}>{Math.round((metrics?.rackConversionRate ?? 0) * 100)}% conversion</Text>
              </View>
            </View>
          </View>
        </View>

        {/* KPI Breakdown */}
        <View style={styles.section}>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiThird}><KpiCard label="Pot" value={Math.round((metrics?.potRate ?? 0) * 100)} icon={Target} delta={0} tone="primary" /></View>
            <View style={styles.kpiThird}><KpiCard label="Position" value={Math.round((metrics?.positionRate ?? 0) * 100)} icon={MapPin} delta={0} tone="accent" /></View>
            <View style={styles.kpiThird}><KpiCard label="Rack" value={Math.round((metrics?.rackConversionRate ?? 0) * 100)} icon={Trophy} delta={0} tone="warning" /></View>
          </View>
        </View>

        {/* Rack Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rack-by-Rack</Text>
          <View style={styles.timelineCard}>
            {racks.length === 0 && <Text style={styles.rackTime}>No racks in this session yet.</Text>}
            {racks.map((r, i) => {
              const pct = (r.pots / r.balls) * 100;
              const isWin = r.outcome === "win";
              return (
                <View key={r.id} style={styles.timelineRow}>
                  {i < racks.length - 1 && <View style={styles.timelineLine} />}
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineNode, isWin ? styles.timelineNodeWin : styles.timelineNodeLoss]}>
                      <Text style={[styles.timelineNodeText, isWin ? styles.timelineNodeTextWin : styles.timelineNodeTextLoss]}>{r.rackNumber}</Text>
                    </View>
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.rackTitle}>Rack {r.rackNumber}</Text>
                      <Text style={styles.rackTime}>
                        {r.endedAt
                          ? new Date(r.endedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </Text>
                    </View>
                    <View style={styles.progressRow}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: isWin ? colors.primaryGlow : colors.warning }]} />
                      </View>
                      <Text style={styles.rackPots}>{r.pots}/{r.balls}</Text>
                    </View>
                    <View style={styles.missesRow}>
                      {Array.from({ length: r.misses }).map((_, k) => (
                        <View key={k} style={styles.missMarker} />
                      ))}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.newSessionBtn} onPress={handleNewSession}>
              <Text style={styles.newSessionText}>New Session</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteSessionBtn} onPress={handleDeleteSession}>
              <Text style={styles.deleteSessionText}>Delete Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  shareButton: {
    height: 40,
    width: 40,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginBottom: 24 },
  heroCard: {
    backgroundColor: "#164c36",
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    bottom: -40,
    right: -40,
    height: 160,
    width: 160,
    borderRadius: 80,
    backgroundColor: "rgba(32, 181, 118, 0.2)",
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 2,
    color: "rgba(247, 245, 240, 0.6)",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 4,
  },
  scoreValue: {
    fontSize: 56,
    fontFamily: "Sora_800ExtraBold",
    color: colors.primaryForeground,
  },
  scoreMax: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(247, 245, 240, 0.7)",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: "rgba(247, 245, 240, 0.7)",
  },
  heroRight: {
    alignItems: "flex-end",
  },
  impactBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(32, 181, 118, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(32, 181, 118, 0.3)",
  },
  impactBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: colors.primaryGlow,
  },
  impactLabel: {
    fontSize: 11,
    color: "rgba(247, 245, 240, 0.7)",
    marginTop: 12,
  },
  impactValue: {
    fontSize: 14,
    fontFamily: "Sora_700Bold",
    color: colors.tierGold,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
  },
  kpiThird: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
    marginBottom: 12,
  },
  timelineCard: {
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
  timelineRow: {
    flexDirection: "row",
    marginBottom: 20,
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    left: 15,
    top: 32,
    bottom: -20,
    width: 2,
    backgroundColor: colors.border,
  },
  timelineLeft: {
    marginRight: 12,
    alignItems: "center",
  },
  timelineNode: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  timelineNodeWin: {
    backgroundColor: "rgba(32, 181, 118, 0.15)",
    borderColor: "rgba(32, 181, 118, 0.4)",
  },
  timelineNodeLoss: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderColor: "rgba(255, 0, 0, 0.3)",
  },
  timelineNodeText: {
    fontSize: 12,
    fontFamily: "Sora_700Bold",
  },
  timelineNodeTextWin: { color: colors.primaryGlow },
  timelineNodeTextLoss: { color: colors.danger },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rackTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.foreground,
  },
  rackTime: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.secondary,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  rackPots: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
  },
  missesRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
  },
  missMarker: {
    height: 6,
    width: 24,
    borderRadius: 3,
    backgroundColor: "rgba(255, 0, 0, 0.6)",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  newSessionBtn: {
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  newSessionText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.foreground,
  },
  deleteSessionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteSessionText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.danger,
  },
});
