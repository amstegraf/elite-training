import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from "react-native";
import { AppHeader } from "../../ui/AppHeader";
import { TierBadge } from "../../ui/TierBadge";
import { colors } from "../../core/theme/theme";
import { Plus, Check, MoreVertical } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppState } from "../../data/AppStateContext";
import { computeGlobalMetrics } from "../../domain/metrics";
import { computeTier } from "../../domain/tier";

export function ProfilesScreen() {
  const {
    data,
    activeProfile,
    createProfile,
    setActiveProfile,
    renameProfile,
    deleteProfile,
  } = useAppState();
  const [showCreate, setShowCreate] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const players = useMemo(
    () =>
      data.profiles.map((p, idx) => {
        const initials = p.name
          .split(" ")
          .filter(Boolean)
          .map((x) => x[0]?.toUpperCase() ?? "")
          .join("")
          .slice(0, 2) || "P";
        const sessions = data.sessions.filter((s) => s.profileId === p.id && s.status === "completed");
        const g = computeGlobalMetrics(sessions);
        const t = computeTier(g.potRate, g.positionRate, g.rackConversionRate, data.settings.tier);
        const palette = [
          [colors.primary, colors.primaryGlow],
          [colors.tierPlatinum, colors.primary],
          [colors.tierSilver, colors.tierPlatinum],
          [colors.tierBronze, colors.accent],
        ] as const;
        return {
          id: p.id,
          name: p.name,
          initials,
          tier: t?.label ?? "Beginner",
          pts: t?.points ?? 0,
          sessions: sessions.length,
          active: activeProfile?.id === p.id,
          gradient: palette[idx % palette.length],
        };
      }),
    [activeProfile?.id, data.profiles, data.sessions, data.settings.tier]
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Profiles" subtitle="Players" back />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {players.map((p) => (
          <TouchableOpacity
            key={p.id}
            activeOpacity={0.9}
            style={[styles.card, p.active && styles.cardActive]}
            onPress={() => setActiveProfile(p.id)}
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
              <MoreVertical
                size={18}
                color={colors.mutedForeground}
                onPress={() =>
                  Alert.alert(p.name, "Profile actions", [
                    { text: "Rename", onPress: () => {
                      setEditingProfileId(p.id);
                      setNameInput(p.name);
                      setShowCreate(true);
                    } },
                    { text: "Delete", style: "destructive", onPress: () => deleteProfile(p.id) },
                    { text: "Cancel", style: "cancel" },
                  ])
                }
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={() => {
          setEditingProfileId(null);
          setNameInput("");
          setShowCreate(true);
        }}>
          <Plus size={18} color={colors.mutedForeground} />
          <Text style={styles.addButtonText}>Add new player</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{nameInput ? "Create or Rename Profile" : "Add Profile"}</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Player name"
              placeholderTextColor={colors.mutedForeground}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => {
                setShowCreate(false);
                setEditingProfileId(null);
              }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => {
                  if (editingProfileId) {
                    renameProfile(editingProfileId, nameInput);
                    setActiveProfile(editingProfileId);
                  } else {
                    createProfile(nameInput);
                  }
                  setShowCreate(false);
                  setEditingProfileId(null);
                }}
              >
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
    marginBottom: 10,
  },
  modalInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    color: colors.foreground,
    fontFamily: "Inter_500Medium",
  },
  modalActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalCancel: {
    height: 38,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    color: colors.foreground,
    fontFamily: "Inter_600SemiBold",
  },
  modalConfirm: {
    height: 38,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    color: colors.primaryForeground,
    fontFamily: "Inter_600SemiBold",
  },
});
