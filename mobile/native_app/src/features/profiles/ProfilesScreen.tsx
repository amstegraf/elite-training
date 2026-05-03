import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { AppHeader } from "../../ui/AppHeader";
import { TierBadge } from "../../ui/TierBadge";
import { colors } from "../../core/theme/theme";
import { Plus, Check, MoreVertical } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const players = [
  { name: "Marco Reyes", initials: "MR", tier: "Gold", pts: 2847, sessions: 124, active: true, gradient: [colors.primary, colors.primaryGlow] as const },
  { name: "Lina Park", initials: "LP", tier: "Platinum", pts: 4120, sessions: 218, gradient: [colors.tierPlatinum, colors.primary] as const },
  { name: "Sasha Kim", initials: "SK", tier: "Silver", pts: 1490, sessions: 62, gradient: [colors.tierSilver, colors.tierPlatinum] as const },
  { name: "Devon Hale", initials: "DH", tier: "Bronze", pts: 680, sessions: 21, gradient: [colors.tierBronze, colors.accent] as const },
];

export function ProfilesScreen() {
  return (
    <View style={styles.container}>
      <AppHeader title="Profiles" subtitle="Players" back />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {players.map((p) => (
          <TouchableOpacity
            key={p.name}
            activeOpacity={0.9}
            style={[styles.card, p.active && styles.cardActive]}
          >
            <LinearGradient
              colors={p.gradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{p.initials}</Text>
            </LinearGradient>

            <View style={styles.cardContent}>
              <View style={styles.nameRow}>
                <Text style={styles.nameText} numberOfLines={1}>{p.name}</Text>
                {p.active && (
                  <View style={styles.activeBadge}>
                    <Check size={10} color={colors.primary} strokeWidth={3} />
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <View style={styles.statsRow}>
                <TierBadge tier={p.tier as any} />
                <Text style={styles.ptsText}>{p.pts.toLocaleString()} pts</Text>
              </View>
              <Text style={styles.sessionsText}>{p.sessions} sessions</Text>
            </View>

            <TouchableOpacity style={styles.moreButton}>
              <MoreVertical size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
          <Plus size={18} color={colors.mutedForeground} />
          <Text style={styles.addButtonText}>Add new player</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  avatarGradient: {
    height: 56,
    width: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Sora_700Bold",
    color: colors.primaryForeground,
  },
  cardContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: colors.foreground,
    flexShrink: 1,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(26, 117, 80, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    gap: 2,
  },
  activeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: colors.primary,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  ptsText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
  },
  sessionsText: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  moreButton: {
    height: 36,
    width: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderRadius: 24,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
  },
});
