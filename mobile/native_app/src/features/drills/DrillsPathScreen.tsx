import React, { useEffect, useMemo, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { colors } from "../../core/theme/theme";
import { useAppState } from "../../data/AppStateContext";
import { getDrillPathProgress } from "../../data/drillPath";
import {
  DrillPathProgress,
  PathNodeIcon,
  PathNodeKind,
  PathNodeProgress,
  PathTier,
} from "../../domain/drillPath";
import {
  Check,
  ChevronRight,
  Crown,
  Crosshair,
  Flame,
  Lock,
  Medal,
  Play,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react-native";
import { TierBadge } from "../../ui/TierBadge";
import { LinearGradient } from "expo-linear-gradient";

const offsets = [0, 34, 18, -18, -34] as const;

const tierGradients: Record<PathTier, readonly [string, string]> = {
  Bronze: [colors.tierBronze, colors.accent],
  Silver: [colors.tierSilver, colors.tierPlatinum],
  Gold: [colors.tierGold, colors.accent],
  Platinum: [colors.tierPlatinum, colors.primaryGlow],
  Elite: [colors.primary, colors.tierElite],
};

function iconForNode(kind: PathNodeKind, icon?: PathNodeIcon) {
  const resolved = icon ?? (kind === "boss" ? "crown" : kind === "chest" ? "sparkles" : kind === "checkpoint" ? "medal" : "crosshair");
  if (resolved === "crown") return Crown;
  if (resolved === "sparkles") return Sparkles;
  if (resolved === "medal") return Medal;
  return Crosshair;
}

function NodeStars({ earned }: { earned: 0 | 1 | 2 | 3 }) {
  return (
    <View style={styles.nodeStars}>
      {[1, 2, 3].map((idx) => (
        <Star
          key={idx}
          size={11}
          color={idx <= earned ? colors.tierGold : "rgba(120,126,145,0.32)"}
          fill={idx <= earned ? colors.tierGold : "rgba(120,126,145,0.1)"}
        />
      ))}
    </View>
  );
}

function PathNodeCard({
  node,
  tier,
  onPress,
}: {
  node: PathNodeProgress;
  tier: PathTier;
  onPress?: () => void;
}) {
  const isLocked = node.status === "locked";
  const isCompleted = node.status === "completed";
  const isCurrent = node.status === "current";
  const NodeIcon = iconForNode(node.kind, node.icon);
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (!isCurrent) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScale, {
          toValue: 1.35,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseScale.setValue(1);
    pulseOpacity.setValue(0.35);
    loop.start();
    return () => {
      loop.stop();
    };
  }, [isCurrent, pulseOpacity, pulseScale]);

  return (
    <View style={{ transform: [{ translateX: offsets[node.offsetVariant ?? 0] }] }}>
      <TouchableOpacity
        activeOpacity={0.86}
        style={[styles.nodeWrap, isLocked && styles.nodeWrapLocked]}
        disabled={isLocked}
        onPress={onPress}
      >
        {isCurrent ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.nodePulse,
              {
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          />
        ) : null}

        <LinearGradient
          colors={
            isLocked
              ? ["rgba(226,224,221,0.7)", "rgba(226,224,221,0.52)"]
              : isCompleted
                ? tierGradients[tier]
                : isCurrent
                  ? [colors.primary, colors.primaryGlow]
                  : [colors.card, colors.card]
          }
          style={[
            styles.nodeDisc,
            isLocked && styles.nodeDiscLocked,
            !isLocked && !isCurrent && !isCompleted && styles.nodeDiscAvailable,
          ]}
        >
          {isLocked ? (
            <Lock size={24} color={colors.mutedForeground} />
          ) : isCompleted ? (
            <Check size={26} color={colors.foreground} />
          ) : (
            <NodeIcon size={26} color={isCurrent ? colors.primaryForeground : colors.primary} />
          )}

          {(node.kind === "boss" || node.kind === "chest") && !isLocked ? (
            <View style={[styles.cornerBadge, node.kind === "boss" ? styles.cornerBadgeBoss : styles.cornerBadgeChest]}>
              {node.kind === "boss" ? (
                <Crown size={13} color={colors.primaryForeground} />
              ) : (
                <Sparkles size={13} color={colors.foreground} />
              )}
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.nodeLabelWrap}>
          <Text
            style={[styles.nodeTitle, isLocked && styles.nodeTitleLocked]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {node.title}
          </Text>
          {isLocked ? (
            <Text style={styles.nodeLockedText}>Locked</Text>
          ) : isCurrent ? (
            <View style={styles.nodeContinueRow}>
              <Play size={10} color={colors.primary} />
              <Text style={styles.nodeContinueText}>Continue</Text>
            </View>
          ) : (
            <NodeStars earned={node.stars} />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

function deriveHeroStats(progress: DrillPathProgress) {
  return {
    totalStars: progress.totalStars,
    maxStars: progress.maxStars,
    completed: progress.completedNodes,
    currentTier: progress.currentTier,
    pct: progress.pct,
  };
}

export function DrillsPathScreen() {
  const nav = useNavigation<any>();
  const { drillResults } = useAppState();
  const progress = useMemo(() => getDrillPathProgress(drillResults), [drillResults]);
  const hero = useMemo(() => deriveHeroStats(progress), [progress]);

  return (
    <View style={styles.container}>
      <AppHeader title="Drills Path" subtitle="Journey" back />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["rgba(26,117,80,0.15)", "rgba(255,255,255,0.96)", "rgba(239,206,95,0.14)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <LinearGradient
              colors={tierGradients[hero.currentTier]}
              style={styles.heroTierIcon}
            >
              <Crown size={26} color={colors.foreground} />
            </LinearGradient>
            <View style={styles.heroMain}>
              <Text style={styles.heroKicker}>Current Tier</Text>
              <View style={styles.heroTierRow}>
                <Text style={styles.heroTierName}>{hero.currentTier}</Text>
                <TierBadge tier={hero.currentTier as any} />
              </View>
              <View style={styles.heroBarTrack}>
                <LinearGradient
                  colors={["#f4c847", "#f7864a", "#ee5b8f"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.heroBarFill, { width: `${Math.max(0, Math.min(100, hero.pct))}%` }]}
                />
              </View>
              <Text style={styles.heroSummaryText}>
                <Text style={styles.heroSummaryStrong}>{hero.totalStars}</Text> / {hero.maxStars} stars
                {" · "}
                <Text style={styles.heroSummaryStrong}>{hero.completed}</Text> levels cleared
              </Text>
            </View>
          </View>

          <View style={styles.heroStatsGrid}>
            <View style={styles.heroStatCard}>
              <Star size={16} color={colors.tierGold} />
              <Text style={styles.heroStatValue}>{hero.totalStars}</Text>
              <Text style={styles.heroStatLabel}>Stars</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Flame size={16} color={colors.accent} />
              <Text style={styles.heroStatValue}>7d</Text>
              <Text style={styles.heroStatLabel}>Streak</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Zap size={16} color={colors.primary} />
              <Text style={styles.heroStatValue}>#{Math.max(1, 200 - hero.totalStars)}</Text>
              <Text style={styles.heroStatLabel}>Rank</Text>
            </View>
          </View>
        </LinearGradient>

        {progress.chapters.map((chapter, idx) => (
          <View key={chapter.id} style={styles.chapterWrap}>
            <LinearGradient
              colors={
                chapter.locked
                  ? ["rgba(255,255,255,0.88)", "rgba(255,255,255,0.82)"]
                  : ["rgba(255,255,255,0.97)", "rgba(26,117,80,0.08)"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.chapterCard}
            >
              <LinearGradient colors={tierGradients[chapter.tier]} style={[styles.chapterIcon, chapter.locked && styles.chapterIconLocked]}>
                <Crown size={18} color={colors.foreground} />
              </LinearGradient>
              <View style={styles.chapterInfo}>
                <View style={styles.chapterTitleRow}>
                  <Text style={styles.chapterKicker}>Chapter {idx + 1}</Text>
                  <TierBadge tier={chapter.tier as any} />
                </View>
                <Text style={styles.chapterTitle}>{chapter.name}</Text>
                <Text style={styles.chapterTagline} numberOfLines={1}>
                  {chapter.tagline}
                </Text>
              </View>
              <View style={styles.chapterRight}>
                <Text style={styles.chapterStarsLabel}>Stars</Text>
                <Text style={styles.chapterStarsValue}>
                  {chapter.earnedStars}
                  <Text style={styles.chapterStarsMax}>/{chapter.maxStars}</Text>
                </Text>
              </View>
            </LinearGradient>

            <View style={styles.chapterBarTrack}>
              <LinearGradient
                colors={tierGradients[chapter.tier]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.chapterBarFill, { width: `${Math.max(0, Math.min(100, chapter.pct))}%` }]}
              />
            </View>

            <View style={styles.pathNodesWrap}>
              <View pointerEvents="none" style={styles.pathSpine} />
              <View style={styles.pathNodesList}>
                {chapter.nodes.map((node) => (
                  <PathNodeCard
                    key={node.id}
                    node={node}
                    tier={chapter.tier}
                    onPress={() => {
                      if (!node.drillId || node.status === "locked") return;
                      nav.navigate("DrillDetail", { drillId: node.drillId });
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        ))}

        <View style={styles.rivalsCard}>
          <View style={styles.rivalsHeader}>
            <View style={styles.rivalsTitleRow}>
              <Trophy size={17} color={colors.tierGold} />
              <Text style={styles.rivalsTitle}>Rivals</Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} onPress={() => nav.navigate("StatsTab")} style={styles.rivalsLinkRow}>
              <Text style={styles.rivalsLinkText}>Full board</Text>
              <ChevronRight size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {[
            { name: "Lina Park", initials: "LP", stars: 48, tier: "Platinum" },
            { name: "Marco Reyes", initials: "MR", stars: 27, tier: "Gold", you: true },
            { name: "Sasha Kim", initials: "SK", stars: 19, tier: "Silver" },
          ].map((rival, idx) => (
            <View key={rival.name} style={[styles.rivalRow, rival.you && styles.rivalRowActive]}>
              <Text style={styles.rivalRank}>{idx + 1}</Text>
              <LinearGradient colors={tierGradients[rival.tier as PathTier]} style={styles.rivalAvatar}>
                <Text style={styles.rivalInitials}>{rival.initials}</Text>
              </LinearGradient>
              <View style={styles.rivalInfo}>
                <View style={styles.rivalNameRow}>
                  <Text style={styles.rivalName}>{rival.name}</Text>
                  {rival.you ? <Text style={styles.rivalYou}>You</Text> : null}
                </View>
                <TierBadge tier={rival.tier as any} />
              </View>
              <View style={styles.rivalStarsWrap}>
                <Star size={12} color={colors.tierGold} fill={colors.tierGold} />
                <Text style={styles.rivalStars}>{rival.stars}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.browseBtn} activeOpacity={0.9} onPress={() => nav.navigate("Drills")}>
          <Text style={styles.browseBtnTitle}>Browse the full Drills Library</Text>
          <View style={styles.browseBtnSubRow}>
            <Target size={12} color={colors.mutedForeground} />
            <Text style={styles.browseBtnSubText}>Practice any drill freely</Text>
            <ChevronRight size={12} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110, gap: 18 },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(26,117,80,0.25)",
    padding: 16,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroTierIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroMain: { flex: 1 },
  heroKicker: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: colors.primary,
    fontFamily: "Inter_700Bold",
  },
  heroTierRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 1 },
  heroTierName: {
    fontSize: 20,
    color: colors.foreground,
    fontFamily: "Sora_800ExtraBold",
  },
  heroBarTrack: {
    marginTop: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(120,126,145,0.16)",
    height: 8,
  },
  heroBarFill: { height: "100%" },
  heroSummaryText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  heroSummaryStrong: {
    color: colors.foreground,
    fontFamily: "Inter_700Bold",
  },
  heroStatsGrid: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226,224,221,0.8)",
    backgroundColor: "rgba(255,255,255,0.82)",
    paddingVertical: 10,
    alignItems: "center",
  },
  heroStatValue: {
    marginTop: 2,
    fontSize: 15,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  heroStatLabel: {
    marginTop: 1,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.mutedForeground,
    fontFamily: "Inter_600SemiBold",
  },
  chapterWrap: { gap: 8 },
  chapterCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(226,224,221,0.8)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chapterIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterIconLocked: {
    opacity: 0.5,
  },
  chapterInfo: { flex: 1 },
  chapterTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  chapterKicker: {
    fontSize: 10,
    color: colors.mutedForeground,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    fontFamily: "Inter_700Bold",
  },
  chapterTitle: {
    marginTop: 1,
    fontSize: 17,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  chapterTagline: {
    marginTop: 1,
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  chapterRight: { alignItems: "flex-end" },
  chapterStarsLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "Inter_700Bold",
  },
  chapterStarsValue: {
    marginTop: 1,
    fontSize: 15,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  chapterStarsMax: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  chapterBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(120,126,145,0.16)",
    overflow: "hidden",
  },
  chapterBarFill: { height: "100%" },
  pathNodesWrap: {
    position: "relative",
    paddingVertical: 8,
  },
  pathSpine: {
    position: "absolute",
    top: 18,
    bottom: 18,
    left: "50%",
    marginLeft: -1,
    borderLeftWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  pathNodesList: { gap: 18 },
  nodeWrap: {
    alignItems: "center",
  },
  nodeWrapLocked: { opacity: 0.68 },
  nodePulse: {
    position: "absolute",
    top: -10,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(26,117,80,0.28)",
  },
  nodeDisc: {
    width: 80,
    height: 80,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  nodeDiscLocked: {
    borderColor: "rgba(120,126,145,0.3)",
  },
  nodeDiscAvailable: {
    borderColor: "rgba(26,117,80,0.35)",
  },
  cornerBadge: {
    position: "absolute",
    top: -7,
    right: -7,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  cornerBadgeBoss: {
    backgroundColor: colors.danger,
  },
  cornerBadgeChest: {
    backgroundColor: colors.tierGold,
  },
  nodeLabelWrap: {
    marginTop: 6,
    width: 146,
    alignItems: "center",
  },
  nodeTitle: {
    fontSize: 11,
    color: colors.foreground,
    fontFamily: "Inter_700Bold",
  },
  nodeTitleLocked: {
    color: colors.mutedForeground,
  },
  nodeLockedText: {
    marginTop: 2,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
    fontFamily: "Inter_700Bold",
  },
  nodeContinueRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nodeContinueText: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.primary,
    fontFamily: "Inter_700Bold",
  },
  nodeStars: {
    marginTop: 2,
    flexDirection: "row",
    gap: 1,
  },
  rivalsCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    gap: 8,
  },
  rivalsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rivalsTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  rivalsTitle: {
    fontSize: 18,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  rivalsLinkRow: { flexDirection: "row", alignItems: "center" },
  rivalsLinkText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  rivalRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rivalRowActive: {
    borderColor: "rgba(26,117,80,0.4)",
    backgroundColor: "rgba(26,117,80,0.1)",
  },
  rivalRank: {
    width: 16,
    textAlign: "center",
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Sora_700Bold",
  },
  rivalAvatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  rivalInitials: {
    fontSize: 11,
    color: colors.primaryForeground,
    fontFamily: "Sora_700Bold",
  },
  rivalInfo: { flex: 1 },
  rivalNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  rivalName: {
    fontSize: 13,
    color: colors.foreground,
    fontFamily: "Inter_600SemiBold",
  },
  rivalYou: {
    fontSize: 9,
    color: colors.primary,
    textTransform: "uppercase",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  rivalStarsWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  rivalStars: {
    fontSize: 12,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  browseBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.62)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 2,
  },
  browseBtnTitle: {
    fontSize: 14,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  browseBtnSubRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  browseBtnSubText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
});
