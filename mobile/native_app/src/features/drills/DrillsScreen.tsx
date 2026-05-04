import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Activity, BarChart3, Calendar, CheckCircle2, ChevronRight, Crown, Filter, Flame, History, Home, Search, Sparkles, Star, Target, Trophy } from "lucide-react-native";
import { AppHeader } from "../../ui/AppHeader";
import { colors } from "../../core/theme/theme";
import { listDrills } from "../../data/drills";
import { DrillDifficulty } from "../../domain/drills";
import { useAppState } from "../../data/AppStateContext";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const difficultyLabel = (difficulty: DrillDifficulty) =>
  difficulty === 1 ? "Easy" : difficulty === 2 ? "Medium" : "Hard";

function diffTone(d: DrillDifficulty) {
  if (d === 1) return { color: colors.primary, bg: "rgba(32, 181, 118, 0.12)", border: "rgba(32, 181, 118, 0.4)" };
  if (d === 2) return { color: colors.tierGold, bg: "rgba(234, 179, 8, 0.12)", border: "rgba(234, 179, 8, 0.4)" };
  return { color: colors.danger, bg: "rgba(255, 75, 75, 0.12)", border: "rgba(255, 75, 75, 0.4)" };
}

function DifficultyStars({ earned }: { earned: 0 | 1 | 2 | 3 }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3].map((idx) => (
        <Star
          key={idx}
          size={12}
          color={idx <= earned ? colors.tierGold : "rgba(120, 126, 145, 0.35)"}
          fill={idx <= earned ? colors.tierGold : "rgba(120, 126, 145, 0.12)"}
        />
      ))}
    </View>
  );
}

export function DrillsScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { drillResults } = useAppState();
  const drills = useMemo(() => listDrills(), []);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [showMastered, setShowMastered] = useState(false);

  const drillStats = useMemo(() => {
    const grouped = new Map<
      string,
      {
        attempts: number;
        completions: number;
        bestStars: 0 | 1 | 2 | 3;
      }
    >();
    drillResults.forEach((result) => {
      const current = grouped.get(result.drillId) ?? { attempts: 0, completions: 0, bestStars: 0 as 0 | 1 | 2 | 3 };
      const nextAttempts = current.attempts + 1;
      const nextCompletions = current.completions + (result.stars >= 2 ? 1 : 0);
      const nextBestStars = (Math.max(current.bestStars, result.stars) as 0 | 1 | 2 | 3);
      grouped.set(result.drillId, {
        attempts: nextAttempts,
        completions: nextCompletions,
        bestStars: nextBestStars,
      });
    });
    return grouped;
  }, [drillResults]);

  const typeOptions = useMemo(() => {
    const categories = Array.from(new Set(drills.map((drill) => drill.category)));
    return ["All", ...categories];
  }, [drills]);

  const filteredDrills = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return drills.filter((drill) => {
      const typeMatch = selectedType === "All" || drill.category === selectedType;
      const textMatch =
        normalizedQuery.length === 0 || drill.name.toLowerCase().includes(normalizedQuery);
      
      const stats = drillStats.get(drill.id);
      const isMastered = (stats?.bestStars ?? 0) === 3;
      const masteredMatch = !showMastered || isMastered;

      return typeMatch && textMatch && masteredMatch;
    });
  }, [drills, query, selectedType, showMastered, drillStats]);

  let totalEarned = 0;
  let completedCount = 0;
  drillStats.forEach((stats) => {
    totalEarned += stats.bestStars;
    if (stats.bestStars === 3) completedCount++;
  });
  const totalMax = drills.length * 3;
  const pct = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

  return (
    <View style={styles.container}>
      <AppHeader title="Drills" subtitle="Library" back />

      <TouchableOpacity
        style={styles.pathCtaWrap}
        activeOpacity={0.9}
        onPress={() => nav.navigate("DrillsPath")}
      >
        <LinearGradient
          colors={["#2c1246", "#2a184f", "#1f1b44"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pathCta}
        >
          <View style={styles.pathCtaIcon}>
            <Crown size={16} color={colors.tierGold} />
          </View>
          <View style={styles.pathCtaTextWrap}>
            <Text style={styles.pathCtaTitle}>Drill Path</Text>
            <Text style={styles.pathCtaSubtitle}>Embark on your chapter journey</Text>
          </View>
          <ChevronRight size={16} color="rgba(255,255,255,0.82)" />
        </LinearGradient>
      </TouchableOpacity>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mastery Hero Card */}
        <LinearGradient
          colors={["rgba(26,117,80,0.15)", "#ffffff", "rgba(234,179,8,0.1)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroInner}>
            <LinearGradient
              colors={["hsl(40, 95%, 55%)", "hsl(25, 95%, 50%)"]}
              style={styles.heroTrophyWrap}
            >
              <Trophy size={24} color="#111" strokeWidth={2.5} />
            </LinearGradient>
            
            <View style={styles.heroCenter}>
              <Text style={styles.heroKicker}>MASTERY</Text>
              <Text style={styles.heroValue}>
                {totalEarned}<Text style={styles.heroValueMuted}>/{totalMax} stars</Text>
              </Text>
              <View style={styles.progressBarWrap}>
                <LinearGradient
                  colors={["hsl(45, 95%, 60%)", "hsl(30, 95%, 60%)", "hsl(340, 85%, 65%)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${pct}%` }]}
                />
              </View>
            </View>

            <View style={styles.heroRight}>
              <Text style={styles.heroKicker}>MASTERED</Text>
              <Text style={styles.heroValue}>{completedCount}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search drills, focus, category..."
            placeholderTextColor={colors.mutedForeground}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity 
            style={[styles.filterBtn, showMastered && styles.filterBtnActive]} 
            onPress={() => setShowMastered(!showMastered)}
            activeOpacity={0.8}
          >
            <Filter size={14} color={showMastered ? colors.tierGold : colors.mutedForeground} />
            <Text style={[styles.filterBtnText, showMastered && styles.filterBtnTextActive]}>
              {showMastered ? "Mastered" : "All"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {typeOptions.map((option) => {
            const active = selectedType === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedType(option)}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {option.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List Header */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listCount}>
            <Text style={styles.listCountBold}>{filteredDrills.length}</Text> drill{filteredDrills.length === 1 ? "" : "s"}
          </Text>
          <View style={styles.listSort}>
            <Sparkles size={12} color={colors.tierGold} />
            <Text style={styles.listSortText}>Sorted by mastery</Text>
          </View>
        </View>

        {/* Drill Cards */}
        {filteredDrills.map((drill) => {
          const stats = drillStats.get(drill.id);
          const bestStars = stats?.bestStars ?? 0;
          const isMastered = bestStars === 3;
          const pctScore = stats && stats.attempts > 0 
            ? Math.round((stats.completions / stats.attempts) * 100) 
            : undefined;

          return (
            <TouchableOpacity
              key={drill.id}
              activeOpacity={0.9}
              style={[styles.card, isMastered && styles.cardMastered]}
              onPress={() => nav.navigate("DrillDetail", { drillId: drill.id })}
            >
              {isMastered && (
                <View style={styles.masteredBadgeFloat}>
                  <CheckCircle2 size={11} color={colors.tierGold} />
                  <Text style={styles.masteredBadgeFloatText}>MASTERED</Text>
                </View>
              )}
              
              <View style={styles.cardContent}>
                {/* Left Icon */}
                <View style={styles.cardIconWrap}>
                  <View style={[
                    styles.cardIconInner,
                    isMastered ? styles.cardIconMastered : bestStars > 0 ? styles.cardIconAttempted : styles.cardIconUnattempted
                  ]}>
                    {isMastered ? (
                      <CheckCircle2 size={20} color="#111" strokeWidth={2.5} />
                    ) : bestStars > 0 ? (
                      <Flame size={18} color={colors.primary} strokeWidth={2.5} />
                    ) : (
                      <Target size={18} color={colors.mutedForeground} strokeWidth={2.5} />
                    )}
                  </View>
                </View>

                {/* Main Info */}
                <View style={styles.cardInfo}>
                  <View style={styles.cardTagsRow}>
                    <View style={[styles.diffBadge, { backgroundColor: diffTone(drill.difficulty).bg, borderColor: diffTone(drill.difficulty).border }]}>
                      <Text style={[styles.diffBadgeText, { color: diffTone(drill.difficulty).color }]}>
                        {difficultyLabel(drill.difficulty)}
                      </Text>
                    </View>
                    <Text style={styles.cardTagsText}>
                      {drill.category.toUpperCase()} · {drill.estMinutes} MIN
                    </Text>
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={1}>{drill.name}</Text>
                  <Text style={styles.cardTagline} numberOfLines={1}>
                    {drill.attemptLimit} attempts challenge
                  </Text>

                  <View style={styles.cardBottomRow}>
                    <DifficultyStars earned={bestStars} />
                    {pctScore !== undefined ? (
                      <Text style={styles.cardBestText}>
                        Best <Text style={styles.cardBestTextBold}>{pctScore}%</Text>
                      </Text>
                    ) : (
                      <Text style={styles.cardBestTextItalic}>Not attempted</Text>
                    )}
                  </View>
                </View>

                {/* Chevron */}
                <View style={styles.cardChevron}>
                  <ChevronRight size={18} color={colors.mutedForeground} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredDrills.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No drills found</Text>
            <Text style={styles.emptyBody}>Try a different search or category.</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.floatingNavWrap, { bottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.floatingNav}>
          <TouchableOpacity
            style={styles.floatingNavItem}
            activeOpacity={0.85}
            onPress={() => nav.navigate("Home", { screen: "DashboardTab" })}
          >
            <Home size={18} color={colors.primary} />
            <Text style={[styles.floatingNavText, styles.floatingNavTextActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.floatingNavItem}
            activeOpacity={0.85}
            onPress={() => nav.navigate("Home", { screen: "SessionTab" })}
          >
            <Activity size={18} color={colors.mutedForeground} />
            <Text style={styles.floatingNavText}>Session</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.floatingNavItem}
            activeOpacity={0.85}
            onPress={() => nav.navigate("Home", { screen: "StatsTab" })}
          >
            <BarChart3 size={18} color={colors.mutedForeground} />
            <Text style={styles.floatingNavText}>Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.floatingNavItem}
            activeOpacity={0.85}
            onPress={() => nav.navigate("Home", { screen: "CalendarTab" })}
          >
            <Calendar size={18} color={colors.mutedForeground} />
            <Text style={styles.floatingNavText}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.floatingNavItem}
            activeOpacity={0.85}
            onPress={() => nav.navigate("Home", { screen: "HistoryTab" })}
          >
            <History size={18} color={colors.mutedForeground} />
            <Text style={styles.floatingNavText}>History</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf9f6", // matching the web light bg
  },
  pathCtaWrap: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  pathCta: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  pathCtaIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(247, 201, 72, 0.45)",
    backgroundColor: "rgba(247, 201, 72, 0.12)",
  },
  pathCtaTextWrap: { flex: 1 },
  pathCtaTitle: {
    fontSize: 14,
    color: "#fff",
    fontFamily: "Sora_700Bold",
  },
  pathCtaSubtitle: {
    marginTop: 1,
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_500Medium",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(26,117,80,0.3)",
    padding: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
  heroInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroTrophyWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "hsl(40, 95%, 55%)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  heroCenter: {
    flex: 1,
  },
  heroKicker: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: colors.primary,
    fontFamily: "Inter_700Bold",
  },
  heroValue: {
    marginTop: 2,
    fontSize: 24,
    color: "#111",
    fontFamily: "Sora_800ExtraBold",
  },
  heroValueMuted: {
    fontSize: 16,
    color: colors.mutedForeground,
    fontFamily: "Inter_600SemiBold",
  },
  progressBarWrap: {
    marginTop: 8,
    height: 8,
    width: "100%",
    backgroundColor: "rgba(120, 126, 145, 0.15)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  heroRight: {
    alignItems: "flex-end",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 14,
    zIndex: 2,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: "#f4f3ee",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226,224,221,0.8)",
    paddingLeft: 42,
    paddingRight: 90, // space for filter btn
    fontSize: 14,
    color: "#111",
    fontFamily: "Inter_500Medium",
  },
  filterBtn: {
    position: "absolute",
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(226,224,221,0.8)",
    backgroundColor: "#ffffff",
  },
  filterBtnActive: {
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    borderColor: "rgba(234, 179, 8, 0.4)",
  },
  filterBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
  },
  filterBtnTextActive: {
    color: colors.tierGold,
  },
  filterRow: {
    gap: 10,
    marginBottom: 20,
    paddingRight: 20,
  },
  filterChip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(226,224,221,0.8)",
    backgroundColor: "#f4f3ee",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: colors.mutedForeground,
    letterSpacing: 0.5,
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  listCount: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  listCountBold: {
    fontFamily: "Inter_700Bold",
    color: "#111",
  },
  listSort: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  listSortText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(226,224,221,0.8)",
    padding: 16,
    marginBottom: 12,
  },
  cardMastered: {
    borderColor: "rgba(234,179,8,0.4)",
    backgroundColor: "#fffdf9",
  },
  masteredBadgeFloat: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.4)",
    backgroundColor: "rgba(234,179,8,0.15)",
  },
  masteredBadgeFloatText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: colors.tierGold,
    letterSpacing: 0.5,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  cardIconWrap: {
    marginTop: 2,
  },
  cardIconInner: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cardIconMastered: {
    backgroundColor: "hsl(40, 95%, 55%)",
    borderColor: "rgba(234,179,8,0.5)",
    shadowColor: "hsl(40, 95%, 55%)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  cardIconAttempted: {
    backgroundColor: "rgba(26,117,80,0.12)",
    borderColor: "rgba(26,117,80,0.3)",
  },
  cardIconUnattempted: {
    backgroundColor: "#f4f3ee",
    borderColor: "rgba(226,224,221,0.8)",
  },
  cardInfo: {
    flex: 1,
  },
  cardTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  diffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  diffBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTagsText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Sora_700Bold",
    color: "#111",
  },
  cardTagline: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.mutedForeground,
  },
  cardBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
  },
  cardBestText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.mutedForeground,
  },
  cardBestTextBold: {
    fontFamily: "Inter_700Bold",
    color: "#111",
  },
  cardBestTextItalic: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.mutedForeground,
    fontStyle: "italic",
  },
  cardChevron: {
    justifyContent: "center",
    paddingTop: 24,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(226,224,221,0.8)",
    backgroundColor: "#f4f3ee",
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    color: "#111",
    fontFamily: "Sora_700Bold",
  },
  emptyBody: {
    marginTop: 4,
    fontSize: 13,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  floatingNavWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  floatingNav: {
    width: "100%",
    maxWidth: 430,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.9)",
    backgroundColor: "rgba(255,255,255,0.96)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    shadowColor: "#13151A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  floatingNavItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  floatingNavText: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  floatingNavTextActive: {
    color: colors.primary,
  },
});
