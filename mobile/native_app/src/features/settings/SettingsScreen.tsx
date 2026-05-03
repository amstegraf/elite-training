import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Modal, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { TierBadge } from "../../ui/TierBadge";
import { colors } from "../../core/theme/theme";
import { Bell, Moon, Vibrate, Volume2, Languages, Users, ChevronRight } from "lucide-react-native";
import { useAppState } from "../../data/AppStateContext";
import { useState } from "react";

export function SettingsScreen() {
  const nav = useNavigation<any>();
  const { data, activeProfile, updatePreference, renameProfile } = useAppState();
  const prefs = data.settings.preferences;
  const tier = data.settings.tier;
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState(activeProfile?.name ?? "");
  const tierRows = [
    { tier: "Beginner", idx: 0 },
    { tier: "Amateur", idx: 1 },
    { tier: "Strong Amateur", idx: 2 },
    { tier: "Advanced", idx: 3 },
  ] as const;

  const ToggleRow = ({ icon: Icon, label, desc, value, onChange }: any) => (
    <View style={styles.row}>
      <View style={styles.iconContainer}>
        <Icon size={16} color={colors.foreground} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {desc && <Text style={styles.rowDesc}>{desc}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.secondary, true: colors.primary }}
        thumbColor={colors.card}
      />
    </View>
  );

  const NavRow = ({ icon: Icon, label, value, onPress }: any) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Icon size={16} color={colors.foreground} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {value && <Text style={styles.rowDesc}>{value}</Text>}
      <ChevronRight size={16} color={colors.mutedForeground} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Settings" subtitle="Preferences" back />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={[styles.card, styles.cardNoPadding]}>
            <TouchableOpacity style={styles.row} onPress={() => {
              setNameInput(activeProfile?.name ?? "");
              setNameModalOpen(true);
            }}>
              <View style={styles.iconContainer}>
                <Users size={16} color={colors.foreground} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Player name</Text>
                <Text style={styles.rowDesc}>{activeProfile?.name ?? "Player 1"}</Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tier Baselines (Read-only) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tier Baselines (Fixed)</Text>
          <View style={styles.card}>
            {tierRows.map((t) => (
              <View key={t.tier} style={styles.baselineRow}>
                <View style={styles.baselineHeader}>
                  <TierBadge tier={t.tier as any} />
                  <Text style={styles.baselineValue}>
                    {Math.round(
                      (tier.potPctLowerBounds[t.idx] + tier.posPctLowerBounds[t.idx] + tier.convPctLowerBounds[t.idx]) / 3
                    )}
                    <Text style={styles.baselineUnit}>%</Text>
                  </Text>
                </View>
                <Text style={styles.rowDesc}>
                  Pot {tier.potPctLowerBounds[t.idx]}% · Pos {tier.posPctLowerBounds[t.idx]}% · Conv {tier.convPctLowerBounds[t.idx]}%
                </Text>
              </View>
            ))}
            <Text style={styles.rowDesc}>
              Weights: Pos {tier.weightPos}, Conv {tier.weightConv}, Pot {tier.weightPot} · Penalty {tier.penaltyFactor}
            </Text>
          </View>
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={[styles.card, styles.cardNoPadding]}>
            <ToggleRow icon={Moon} label="Dark mode" desc="Easier on the eyes" value={prefs.darkMode} onChange={(v: boolean) => updatePreference("darkMode", v)} />
            <View style={styles.divider} />
            <ToggleRow icon={Vibrate} label="Haptic feedback" value={prefs.haptics} onChange={(v: boolean) => updatePreference("haptics", v)} />
            <View style={styles.divider} />
            <ToggleRow icon={Volume2} label="Sound effects" value={prefs.sound} onChange={(v: boolean) => updatePreference("sound", v)} />
            <View style={styles.divider} />
            <ToggleRow icon={Bell} label="Practice reminders" desc={`Daily at ${prefs.reminderTime}`} value={prefs.reminders} onChange={(v: boolean) => updatePreference("reminders", v)} />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={[styles.card, styles.cardNoPadding]}>
            <NavRow icon={Users} label="Manage profiles" onPress={() => nav.navigate("Profiles")} />
            <View style={styles.divider} />
            <NavRow icon={Languages} label="Language" value={prefs.language} />
          </View>
        </View>

        <Text style={styles.versionText}>Cue Path v1.0.0</Text>
      </ScrollView>

      <Modal visible={nameModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit player name</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Player name"
              placeholderTextColor={colors.mutedForeground}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setNameModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => {
                  if (activeProfile) {
                    renameProfile(activeProfile.id, nameInput);
                  }
                  setNameModalOpen(false);
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
    marginBottom: 10,
  },
  card: {
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
  cardNoPadding: {
    padding: 0,
    overflow: "hidden",
  },
  baselineRow: {
    marginBottom: 16,
  },
  baselineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  baselineValue: {
    fontSize: 16,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
  },
  baselineUnit: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconContainer: {
    height: 36,
    width: 36,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.foreground,
  },
  rowDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 8,
    marginBottom: 20,
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
