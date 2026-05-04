import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { GameTypeModal } from "../../ui/GameTypeModal";
import { KpiCard } from "../../ui/KpiCard";
import { TierBadge } from "../../ui/TierBadge";
import { ProfileMenu } from "./ProfileMenu";
import { colors } from "../../core/theme/theme";
import { Play, Target, MapPin, Trophy, Flame, ChevronRight, Bell, Star, Crosshair, Sparkles, Map as MapIcon } from "lucide-react-native";
import { useAppState } from "../../data/AppStateContext";
import { TIER_LABELS } from "../../domain/types";
import { listDrills } from "../../data/drills";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";

export function DashboardScreen() {
  const nav = useNavigation<any>();
  const scrollRef = useRef<ScrollView | null>(null);
  const { ready, activeProfile, activeSessions, drillResults, global, baseline, tier, startSession } = useAppState();
  const [showGameTypeModal, setShowGameTypeModal] = React.useState(false);
  const drills = useMemo(() => listDrills(), []);

  const potPct = global.potRate === null ? 0 : Math.round(global.potRate * 100);
  const posPct = global.positionRate === null ? 0 : Math.round(global.positionRate * 100);
  const convPct = global.rackConversionRate === null ? 0 : Math.round(global.rackConversionRate * 100);
  const tierPoints = tier?.points ?? 0;
  const tierProgress = tier?.progressPct ?? 0;
  const pointsToNext = tier?.pointsToNext;
  const currentTierIdx = tier ? TIER_LABELS.indexOf(tier.label) : -1;
  const nextTierLabel =
    pointsToNext === null || currentTierIdx < 0 || currentTierIdx >= TIER_LABELS.length - 1
      ? null
      : TIER_LABELS[currentTierIdx + 1];
  const drillById = useMemo(() => new Map(drills.map((drill) => [drill.id, drill])), [drills]);
  const drillRows = useMemo(() => {
    return drills.map((drill) => {
      const runs = drillResults.filter((result) => result.drillId === drill.id);
      const stars = runs.reduce((best, row) => Math.max(best, row.stars), 0);
      return {
        id: drill.id,
        name: drill.name,
        stars,
        max: 3,
        hue: drill.hue,
      };
    });
  }, [drills, drillResults]);
  const drillRowById = useMemo(() => new Map(drillRows.map((row) => [row.id, row])), [drillRows]);
  const dashboardDrillRows = useMemo(() => {
    const selectedIds: string[] = [];
    const seen = new Set<string>();

    // First priority: latest taken drills (unique by drillId)
    for (const run of drillResults) {
      if (!drillById.has(run.drillId) || seen.has(run.drillId)) continue;
      selectedIds.push(run.drillId);
      seen.add(run.drillId);
      if (selectedIds.length >= 5) break;
    }

    // Fallback: latest added drills until we reach 5
    if (selectedIds.length < 5) {
      for (const drill of [...drills].reverse()) {
        if (seen.has(drill.id)) continue;
        selectedIds.push(drill.id);
        seen.add(drill.id);
        if (selectedIds.length >= 5) break;
      }
    }

    return selectedIds
      .map((id) => drillRowById.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }, [drillById, drillResults, drillRowById, drills]);
  const earnedStars = drillRows.reduce((sum, row) => sum + row.stars, 0);
  const totalStars = drillRows.reduce((sum, row) => sum + row.max, 0);
  const drillPct = totalStars > 0 ? (earnedStars / totalStars) * 100 : 0;

  const handleStart = () => {
    const existing = activeSessions[0];
    if (existing) {
      nav.navigate("Session", { sessionId: existing.id });
      return;
    }
    setShowGameTypeModal(true);
  };

  const handleGameTypeSelected = (ballCount: 8 | 9 | 10): boolean => {
    const createdId = startSession(ballCount);
    if (!createdId) return false;
    setShowGameTypeModal(false);
    if (createdId) {
      nav.navigate("Session", { sessionId: createdId });
      return true;
    }
    return false;
  };

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  return (
    <View style={styles.container}>
      <AppHeader
        subtitle="Welcome back"
        title={activeProfile?.name ?? "Player"}
        left={<ProfileMenu name={activeProfile?.name ?? "Player"} />}
        right={
          <TouchableOpacity style={styles.bellButton} activeOpacity={0.8}>
            <Bell size={18} color={colors.foreground} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        }
      />

      <ScrollView ref={scrollRef} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
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
                    : `${pointsToNext} to next tier `}
                  {nextTierLabel && (
                    <Text style={{ color: colors.tierGold, fontWeight: "bold" }}>{nextTierLabel}</Text>
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
            <Text style={styles.sectionTitle}>Overall</Text>
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
              <KpiCard label="Conversion" value={convPct} icon={Trophy} delta={baseline.convDiff ?? 0} tone="warning" />
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
                <Text style={styles.ctaDesc}>8/9/10-Ball · Standard Drill</Text>
              </View>
              <View style={styles.ctaIconContainer}>
                <Play size={28} color={colors.primaryForeground} fill={colors.primaryForeground} style={{ marginLeft: 4 }} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Drill Journey CTA */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Drill Journey</Text>
            <TouchableOpacity onPress={() => nav.navigate("DrillsPath")} style={styles.sectionLinkRow}>
              <Text style={styles.sectionLink}>View map</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity activeOpacity={0.9} onPress={() => nav.navigate("DrillsPath")}>
            <LinearGradient
              colors={["#2d1350", "#431163", "#7a154e"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.journeyCard}
            >
              <View style={styles.journeyGlowGold} />
              <View style={styles.journeyGlowPurple} />

              <View style={styles.journeyPathSvg}>
                <Svg width="100%" height="100%" viewBox="0 0 100 200" preserveAspectRatio="none">
                  <Path
                    d="M70 10 Q 20 50 70 90 Q 20 130 70 170"
                    stroke="rgba(245, 179, 88, 0.9)"
                    strokeWidth="2.5"
                    strokeDasharray="4 6"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <Circle cx="70" cy="10" r="9" fill="hsl(45,95%,60%)" />
                  <Circle cx="70" cy="90" r="9" fill="hsl(30,95%,60%)" />
                  <Circle cx="70" cy="170" r="9" fill="hsl(280,60%,50%)" fillOpacity="0.45" />
                </Svg>
              </View>

              <View style={styles.journeyInner}>
                <View style={styles.journeyChip}>
                  <Sparkles size={11} color={colors.tierGold} />
                  <Text style={styles.journeyChipText}>New Path</Text>
                </View>

                <Text style={styles.journeyTitle}>
                  Start your{"\n"}Drill Journey
                </Text>
                <Text style={styles.journeyDescription}>
                  Climb from <Text style={styles.journeyBronze}>Bronze</Text> to{" "}
                  <Text style={styles.journeyElite}>Elite</Text>. Unlock chapters, beat bosses, earn badges.
                </Text>

                <View style={styles.journeyTierRail}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <React.Fragment key={n}>
                      <View
                        style={[
                          styles.journeyTierDot,
                          n === 1 && { backgroundColor: "hsl(28,60%,50%)", opacity: 1 },
                          n === 2 && { backgroundColor: "hsl(220,10%,75%)", opacity: 1 },
                          n === 3 && { backgroundColor: "hsl(45,95%,60%)", opacity: 0.35 },
                          n === 4 && { backgroundColor: "hsl(190,70%,70%)", opacity: 0.35 },
                          n === 5 && { backgroundColor: "hsl(280,85%,65%)", opacity: 0.35 },
                        ]}
                      />
                      {n < 5 ? <View style={styles.journeyTierConnector} /> : null}
                    </React.Fragment>
                  ))}
                </View>

                <View style={styles.journeyFooterRow}>
                  <View style={styles.journeyBeginBtn}>
                    <MapIcon size={14} color="#311727" />
                    <Text style={styles.journeyBeginText}>Begin Journey</Text>
                  </View>
                  <View>
                    <Text style={styles.journeyFooterText}>Chapter 1</Text>
                    <Text style={styles.journeyFooterTextStrong}>Bronze · Stop Shot</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Drills progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Drills</Text>
            <TouchableOpacity onPress={() => nav.navigate("Drills")} style={styles.sectionLinkRow}>
              <Text style={styles.sectionLink}>All</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <LinearGradient
            colors={["#351049", "#2f1347", "#25153f"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.drillsCard}
          >
            <View style={styles.drillsGlowOne} />
            <View style={styles.drillsGlowTwo} />

            <View style={styles.drillsTopRow}>
              <View>
                <Text style={styles.drillsKicker}>Stars Collected</Text>
                <View style={styles.drillsScoreRow}>
                  <Star size={24} color={colors.tierGold} fill={colors.tierGold} />
                  <Text style={styles.drillsScoreValue}>{earnedStars}</Text>
                  <Text style={styles.drillsScoreMax}>/ {Math.max(totalStars, 1)}</Text>
                </View>
                <Text style={styles.drillsSubtext}>
                  {drillRows.length} drills · {Math.round(drillPct)}% mastered
                </Text>
              </View>
              <View style={styles.drillsCrosshairWrap}>
                <Crosshair size={18} color={colors.tierGold} />
              </View>
            </View>

            <View style={styles.drillsBarTrack}>
              <LinearGradient
                colors={["#f4c847", "#f7864a", "#ee5b8f"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.drillsBarFill, { width: `${Math.max(0, Math.min(100, drillPct))}%` }]}
              />
            </View>

            <View style={styles.drillRows}>
              {dashboardDrillRows.map((row) => (
                <TouchableOpacity
                  key={row.id}
                  style={styles.drillRow}
                  activeOpacity={0.86}
                  onPress={() => nav.navigate("DrillDetail", { drillId: row.id })}
                >
                  <View
                    style={[
                      styles.drillRowIcon,
                      {
                        backgroundColor: `hsla(${row.hue}, 82%, 62%, 0.17)`,
                        borderColor: `hsla(${row.hue}, 82%, 62%, 0.35)`,
                      },
                    ]}
                  >
                    <Target size={13} color={`hsl(${row.hue}, 82%, 68%)`} />
                  </View>
                  <Text style={styles.drillRowName} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <View style={styles.drillRowStars}>
                    {Array.from({ length: row.max }).map((_, idx) => (
                      <Star
                        key={`${row.id}-${idx}`}
                        size={13}
                        color={idx < row.stars ? colors.tierGold : "rgba(255,255,255,0.2)"}
                        fill={idx < row.stars ? colors.tierGold : "rgba(255,255,255,0.02)"}
                      />
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.trainDrillsBtn} activeOpacity={0.9} onPress={() => nav.navigate("Drills")}>
              <LinearGradient
                colors={["#f4c847", "#f7864a", "#ee5b8f"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.trainDrillsBtnBg}
              >
                <Crosshair size={15} color={colors.foreground} />
                <Text style={styles.trainDrillsText}>Train Drills</Text>
                <ChevronRight size={15} color={colors.foreground} />
              </LinearGradient>
            </TouchableOpacity>

          </LinearGradient>
        </View>

      </ScrollView>
      <GameTypeModal
        visible={showGameTypeModal}
        onSelect={handleGameTypeSelected}
        disabled={!ready}
        disabledLabel="Preparing player profile..."
        onCancel={() => setShowGameTypeModal(false)}
      />
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
  journeyCard: {
    borderRadius: 24,
    padding: 18,
    minHeight: 238,
    overflow: "hidden",
  },
  journeyGlowGold: {
    position: "absolute",
    top: -56,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(247, 196, 76, 0.2)",
  },
  journeyGlowPurple: {
    position: "absolute",
    bottom: -70,
    left: -52,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(153, 84, 215, 0.24)",
  },
  journeyPathSvg: {
    position: "absolute",
    right: 6,
    top: 0,
    bottom: 0,
    width: 92,
    opacity: 0.8,
  },
  journeyInner: {
    flex: 1,
    justifyContent: "space-between",
  },
  journeyChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  journeyChipText: {
    textTransform: "uppercase",
    color: "#f7f5f0",
    letterSpacing: 1.5,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  journeyTitle: {
    marginTop: 12,
    color: "#fff",
    fontSize: 36,
    lineHeight: 38,
    fontFamily: "Sora_700Bold",
  },
  journeyDescription: {
    marginTop: 6,
    maxWidth: "78%",
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
  },
  journeyBronze: {
    color: "hsl(28, 76%, 60%)",
    fontFamily: "Inter_700Bold",
  },
  journeyElite: {
    color: "hsl(280, 88%, 71%)",
    fontFamily: "Inter_700Bold",
  },
  journeyTierRail: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  journeyTierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  journeyTierConnector: {
    width: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 4,
  },
  journeyFooterRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  journeyBeginBtn: {
    height: 44,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#f5bc45",
  },
  journeyBeginText: {
    color: "#311727",
    fontSize: 16,
    fontFamily: "Sora_700Bold",
  },
  journeyFooterText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  journeyFooterTextStrong: {
    marginTop: 2,
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  drillsCard: {
    borderRadius: 24,
    padding: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  drillsGlowOne: {
    position: "absolute",
    top: -38,
    right: -20,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255, 193, 74, 0.2)",
  },
  drillsGlowTwo: {
    position: "absolute",
    bottom: -52,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(205, 84, 190, 0.18)",
  },
  drillsTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  drillsKicker: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_600SemiBold",
  },
  drillsScoreRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  drillsScoreValue: {
    fontSize: 34,
    lineHeight: 38,
    color: "#fff",
    fontFamily: "Sora_800ExtraBold",
  },
  drillsScoreMax: {
    marginTop: 7,
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_600SemiBold",
  },
  drillsSubtext: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_500Medium",
  },
  drillsCrosshairWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(255, 201, 72, 0.5)",
    backgroundColor: "rgba(255, 201, 72, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  drillsBarTrack: {
    marginTop: 14,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  drillsBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  drillRows: {
    marginTop: 14,
    gap: 8,
  },
  drillRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  drillRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  drillRowName: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  drillRowStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  trainDrillsBtn: {
    marginTop: 14,
    borderRadius: 14,
    overflow: "hidden",
  },
  trainDrillsBtnBg: {
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  trainDrillsText: {
    color: colors.foreground,
    fontSize: 13,
    fontFamily: "Sora_700Bold",
  },
});
