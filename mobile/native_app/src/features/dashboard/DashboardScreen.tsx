import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { KpiCard } from "../../ui/KpiCard";
import { TierBadge } from "../../ui/TierBadge";
import { colors } from "../../core/theme/theme";
import { Play, Target, MapPin, Trophy, Flame, ChevronRight, Bell } from "lucide-react-native";
import { useAppState } from "../../data/AppStateContext";
import { computeSessionMetrics, completedSessionsSorted, formatDurationLabel } from "../../domain/metrics";

export function DashboardScreen() {
  const nav = useNavigation<any>();
  const { activeProfile, activeSessions, completedSessions, global, baseline, tier, startSession } = useAppState();
  const recent = completedSessionsSorted(completedSessions).slice(0, 3);

  const potPct = global.potRate === null ? 0 : Math.round(global.potRate * 100);
  const posPct = global.positionRate === null ? 0 : Math.round(global.positionRate * 100);
  const convPct = global.rackConversionRate === null ? 0 : Math.round(global.rackConversionRate * 100);
  const tierPoints = tier?.points ?? 0;
  const tierProgress = tier?.progressPct ?? 0;
  const pointsToNext = tier?.pointsToNext;

  const handleStart = () => {
    const existing = activeSessions[0];
    if (existing) {
      nav.navigate("Session", { sessionId: existing.id });
      return;
    }
    const createdId = startSession();
    if (createdId) {
      nav.navigate("Session", { sessionId: createdId });
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        subtitle="Welcome back"
        title={activeProfile?.name ?? "Player"}
        right={
          <TouchableOpacity style={styles.bellButton} activeOpacity={0.8}>
            <Bell size={18} color={colors.foreground} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        {/* Tier / Points Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            {/* Background Glow */}
            <View style={styles.heroGlow} />
            
            <View style={styles.heroTopRow}>
              <View>
                <TierBadge tier={tier?.label ?? "Beginner"} />
                <View style={styles.pointsRow}>
                  <Text style={styles.pointsValue}>{tierPoints.toLocaleString()}</Text>
                  <Text style={styles.pointsUnit}>pts</Text>
                </View>
                <Text style={styles.pointsSubtext}>
                  {pointsToNext === null
                    ? "Max tier reached"
                    : `${pointsToNext} to `}
                  {pointsToNext !== null && (
                    <Text style={{ color: colors.tierPlatinum, fontWeight: "bold" }}>next tier</Text>
                  )}
                </Text>
              </View>
              <View style={styles.trophyIconContainer}>
                <Trophy size={36} color={colors.tierGold} strokeWidth={2.2} />
              </View>
            </View>

            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.max(0, Math.min(100, tierProgress))}%` }]} />
            </View>
            
            <View style={styles.heroBottomRow}>
              <View style={styles.streakContainer}>
                <Flame size={12} color={colors.accent} />
                <Text style={styles.streakText}>{activeSessions.length > 0 ? "Session in progress" : "Ready to train"}</Text>
              </View>
              <Text style={styles.streakText}>{Math.round(tierProgress)}%</Text>
            </View>
          </View>
        </View>

        {/* KPI Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Last 7 days</Text>
            <TouchableOpacity onPress={() => nav.navigate("StatsTab")} style={styles.sectionLinkRow}>
              <Text style={styles.sectionLink}>Stats</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiFullWidth}>
              <KpiCard label="Pot Success" value={potPct} icon={Target} delta={baseline.potDiff ?? 0} tone="primary" size="lg" />
            </View>
            <View style={styles.kpiHalfWidth}>
              <KpiCard label="Position" value={posPct} icon={MapPin} delta={baseline.posDiff ?? 0} tone="accent" />
            </View>
            <View style={styles.kpiHalfWidth}>
              <KpiCard label="Rack Conv." value={convPct} icon={Trophy} delta={baseline.convDiff ?? 0} tone="warning" />
            </View>
          </View>
        </View>

        {/* Start Session CTA */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.ctaCard}
            activeOpacity={0.9}
            onPress={handleStart}
          >
            <View style={styles.ctaRow}>
              <View>
                <Text style={styles.ctaSubtext}>Ready to train?</Text>
                <Text style={styles.ctaTitle}>{activeSessions.length > 0 ? "Resume Session" : "Start Session"}</Text>
                <Text style={styles.ctaDesc}>9-Ball · Standard Drill</Text>
              </View>
              <View style={styles.ctaIconContainer}>
                <Play size={28} color={colors.primaryForeground} fill={colors.primaryForeground} style={{ marginLeft: 4 }} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <TouchableOpacity onPress={() => nav.navigate("HistoryTab")} style={styles.sectionLinkRow}>
              <Text style={styles.sectionLink}>All</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.recentList}>
            {recent.map((s) => {
              const derived = computeSessionMetrics(s);
              const k = derived.potRate === null ? 0 : Math.round(derived.potRate * 100);
              const d = new Date(s.startedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
              <TouchableOpacity key={s.id} style={styles.recentItem} activeOpacity={0.8} onPress={() => nav.navigate("Report", { sessionId: s.id })}>
                <View style={styles.recentLeft}>
                  <View style={styles.recentIcon}>
                    <Target size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.recentDate}>{d}</Text>
                    <Text style={styles.recentDur}>{formatDurationLabel(derived.durationSeconds)} · {derived.totalRacks} racks</Text>
                  </View>
                </View>
                <View style={styles.recentRight}>
                  <Text style={styles.recentScore}>{k}<Text style={styles.recentScoreUnit}>%</Text></Text>
                  <Text style={styles.recentScoreLabel}>POT</Text>
                </View>
              </TouchableOpacity>
            );})}
            {recent.length === 0 && (
              <View style={styles.recentItem}>
                <Text style={styles.recentDur}>No completed sessions yet.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bellButton: {
    height: 40,
    width: 40,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroSection: {
    marginBottom: 24,
  },
  heroCard: {
    backgroundColor: "#164c36", // Approx for gradient-felt
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 8,
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    height: 160,
    width: 160,
    borderRadius: 80,
    backgroundColor: "rgba(32, 181, 118, 0.2)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 12,
  },
  pointsValue: {
    fontSize: 48,
    fontFamily: "Sora_800ExtraBold",
    color: colors.primaryForeground,
  },
  pointsUnit: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(247, 245, 240, 0.7)",
  },
  pointsSubtext: {
    fontSize: 12,
    color: "rgba(247, 245, 240, 0.7)",
    marginTop: 4,
  },
  trophyIconContainer: {
    height: 80,
    width: 80,
    borderRadius: 24,
    backgroundColor: "rgba(32, 181, 118, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(32, 181, 118, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(247, 245, 240, 0.1)",
    marginTop: 16,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.tierGold,
    borderRadius: 4,
  },
  heroBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakText: {
    fontSize: 11,
    color: "rgba(247, 245, 240, 0.6)",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
  },
  sectionLinkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionLink: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.primary,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  kpiFullWidth: {
    width: "100%",
  },
  kpiHalfWidth: {
    width: "48%",
  },
  ctaCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 20,
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 8,
  },
  ctaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ctaSubtext: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.8,
    color: "rgba(247, 245, 240, 0.7)",
  },
  ctaTitle: {
    fontSize: 24,
    fontFamily: "Sora_700Bold",
    color: colors.primaryForeground,
    marginTop: 4,
  },
  ctaDesc: {
    fontSize: 12,
    color: "rgba(247, 245, 240, 0.7)",
    marginTop: 4,
  },
  ctaIconContainer: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: "rgba(247, 245, 240, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  recentList: {
    gap: 8,
  },
  recentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.6)",
  },
  recentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recentIcon: {
    height: 44,
    width: 44,
    borderRadius: 16,
    backgroundColor: "rgba(26, 117, 80, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  recentDate: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.foreground,
  },
  recentDur: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  recentRight: {
    alignItems: "flex-end",
  },
  recentScore: {
    fontSize: 18,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
  },
  recentScoreUnit: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  recentScoreLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
    letterSpacing: 0.5,
  },
});
