import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CheckCircle2, Search, Star, Target } from "lucide-react-native";
import { AppHeader } from "../../ui/AppHeader";
import { colors } from "../../core/theme/theme";
import { listDrills } from "../../data/drills";
import { DrillDifficulty } from "../../domain/drills";
import { useAppState } from "../../data/AppStateContext";

const difficultyLabel = (difficulty: DrillDifficulty) =>
  difficulty === 1 ? "Easy" : difficulty === 2 ? "Medium" : "Hard";

function DifficultyStars({ level }: { level: DrillDifficulty }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3].map((idx) => (
        <Star
          key={idx}
          size={12}
          color={idx <= level ? colors.tierGold : "rgba(120, 126, 145, 0.45)"}
          fill={idx <= level ? colors.tierGold : "rgba(120, 126, 145, 0.12)"}
        />
      ))}
    </View>
  );
}

export function DrillsScreen() {
  const nav = useNavigation<any>();
  const { drillResults } = useAppState();
  const drills = useMemo(() => listDrills(), []);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

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
    return ["all", ...categories];
  }, [drills]);

  const filteredDrills = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return drills.filter((drill) => {
      const typeMatch = selectedType === "all" || drill.category === selectedType;
      const textMatch =
        normalizedQuery.length === 0 || drill.name.toLowerCase().includes(normalizedQuery);
      return typeMatch && textMatch;
    });
  }, [drills, query, selectedType]);

  return (
    <View style={styles.container}>
      <AppHeader title="My Drills" subtitle="Drill Library" back />
      <View style={styles.filtersWrap}>
        <View style={styles.searchBox}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search drills by title"
            placeholderTextColor={colors.mutedForeground}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
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
                  {option === "all" ? "All types" : option.replaceAll("_", " ")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredDrills.map((drill) => {
          const stats = drillStats.get(drill.id);
          const bestStars = stats?.bestStars ?? 0;
          const runs = stats?.attempts ?? 0;
          const completionCount = stats?.completions ?? 0;
          const isCompleted = bestStars >= 2;
          return (
            <TouchableOpacity
              key={drill.id}
              activeOpacity={0.9}
              style={styles.card}
              onPress={() => nav.navigate("DrillDetail", { drillId: drill.id })}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.left}>
                  <Text style={styles.name}>{drill.name}</Text>
                  <Text style={styles.category}>{drill.category.replaceAll("_", " ")}</Text>
                </View>
                {isCompleted ? (
                  <View style={styles.completedBadge}>
                    <CheckCircle2 size={12} color={colors.primary} />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.statPillRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statPillText}>{drill.attemptLimit} attempts</Text>
                </View>
                {runs > 0 ? (
                  <View style={styles.statPill}>
                    <Text style={styles.statPillText}>{completionCount}/{runs} cleared</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <DifficultyStars level={drill.difficulty} />
                  <Text style={styles.metaText}>{difficultyLabel(drill.difficulty)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Target size={12} color={colors.primary} />
                  <Text style={styles.metaText}>~{drill.estMinutes} min</Text>
                </View>
                <View style={styles.metaItem}>
                  <Star
                    size={12}
                    color={bestStars > 0 ? colors.tierGold : colors.mutedForeground}
                    fill={bestStars > 0 ? colors.tierGold : "transparent"}
                  />
                  <Text style={styles.metaText}>{bestStars}/3 best</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        {filteredDrills.length === 0 && drills.length > 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No drills match your filters</Text>
            <Text style={styles.emptyBody}>
              Try another title search or change the selected type filter.
            </Text>
            {(query.length > 0 || selectedType !== "all") && (
              <TouchableOpacity
                style={styles.clearFiltersBtn}
                onPress={() => {
                  setQuery("");
                  setSelectedType("all");
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.clearFiltersText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {drills.length === 0 && filteredDrills.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No drills available</Text>
            <Text style={styles.emptyBody}>Add drill JSON entries to load your drill library.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filtersWrap: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 10,
  },
  searchBox: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(226,224,221,0.75)",
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    fontFamily: "Inter_500Medium",
    paddingVertical: 0,
  },
  filterRow: {
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: {
    borderColor: "rgba(26,117,80,0.5)",
    backgroundColor: "rgba(26,117,80,0.12)",
  },
  filterChipText: {
    textTransform: "capitalize",
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_600SemiBold",
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 10,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(226,224,221,0.75)",
    backgroundColor: colors.card,
    padding: 14,
    shadowColor: "#13151A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  left: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
  },
  category: {
    marginTop: 2,
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
  },
  completedBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(26,117,80,0.5)",
    backgroundColor: "rgba(26,117,80,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  statPillRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  statPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(26,117,80,0.11)",
  },
  statPillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.primary,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 16,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  emptyBody: {
    marginTop: 4,
    fontSize: 13,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  clearFiltersBtn: {
    marginTop: 10,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
  },
  clearFiltersText: {
    color: colors.foreground,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
