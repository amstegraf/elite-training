import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { KpiCard } from "../../ui/KpiCard";
import { TierBadge } from "../../ui/TierBadge";
import { colors } from "../../core/theme/theme";
import { Play, Target, MapPin, Trophy, Flame, ChevronRight, Bell } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function DashboardScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <AppHeader
        subtitle="Welcome back"
        title="Marco Reyes"
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
                <TierBadge tier="Gold" />
                <View style={styles.pointsRow}>
                  <Text style={styles.pointsValue}>2,847</Text>
                  <Text style={styles.pointsUnit}>pts</Text>
                </View>
                <Text style={styles.pointsSubtext}>
                  153 to <Text style={{ color: colors.tierPlatinum, fontWeight: "bold" }}>Platinum</Text>
                </Text>
              </View>
              <View style={styles.trophyIconContainer}>
                <Trophy size={36} color={colors.tierGold} strokeWidth={2.2} />
              </View>
            </View>

            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: "84%" }]} />
            </View>
            
            <View style={styles.heroBottomRow}>
              <View style={styles.streakContainer}>
                <Flame size={12} color={colors.accent} />
                <Text style={styles.streakText}>12-day streak</Text>
              </View>
              <Text style={styles.streakText}>84%</Text>
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
              <KpiCard label="Pot Success" value={78} icon={Target} delta={4} tone="primary" size="lg" />
            </View>
            <View style={styles.kpiHalfWidth}>
              <KpiCard label="Position" value={64} icon={MapPin} delta={-2} tone="accent" />
            </View>
            <View style={styles.kpiHalfWidth}>
              <KpiCard label="Rack Conv." value={42} icon={Trophy} delta={6} tone="warning" />
            </View>
          </View>
        </View>

        {/* Start Session CTA */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.ctaCard}
            activeOpacity={0.9}
            onPress={() => nav.navigate("SessionTab")}
          >
            <View style={styles.ctaRow}>
              <View>
                <Text style={styles.ctaSubtext}>Ready to train?</Text>
                <Text style={styles.ctaTitle}>Start Session</Text>
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
            {[
              { d: "Today, 09:42", dur: "48m", k: 81 },
              { d: "Yesterday", dur: "32m", k: 74 },
              { d: "Mon, Apr 28", dur: "55m", k: 69 },
            ].map((s, i) => (
              <TouchableOpacity key={i} style={styles.recentItem} activeOpacity={0.8} onPress={() => nav.navigate("Report")}>
                <View style={styles.recentLeft}>
                  <View style={styles.recentIcon}>
                    <Target size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.recentDate}>{s.d}</Text>
                    <Text style={styles.recentDur}>{s.dur} · 6 racks</Text>
                  </View>
                </View>
                <View style={styles.recentRight}>
                  <Text style={styles.recentScore}>{s.k}<Text style={styles.recentScoreUnit}>%</Text></Text>
                  <Text style={styles.recentScoreLabel}>POT</Text>
                </View>
              </TouchableOpacity>
            ))}
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
