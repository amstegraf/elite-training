import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Star, Target } from "lucide-react-native";
import { AppHeader } from "../../ui/AppHeader";
import { colors } from "../../core/theme/theme";
import { listDrills } from "../../data/drills";
import { DrillDifficulty } from "../../domain/drills";

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
  const drills = useMemo(() => listDrills(), []);

  return (
    <View style={styles.container}>
      <AppHeader title="My Drills" subtitle="Drill Library" back />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {drills.map((drill) => (
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
              <View style={styles.statPill}>
                <Text style={styles.statPillText}>{drill.attemptLimit} attempts</Text>
              </View>
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
            </View>
          </TouchableOpacity>
        ))}
        {drills.length === 0 && (
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
});
