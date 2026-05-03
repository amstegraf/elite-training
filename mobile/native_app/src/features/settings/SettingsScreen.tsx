import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { TierBadge } from "../../ui/TierBadge";
import { colors } from "../../core/theme/theme";
import { Bell, Moon, Vibrate, Volume2, Languages, Users, ChevronRight } from "lucide-react-native";
import Slider from "@react-native-community/slider";
import { useAppState } from "../../data/AppStateContext";

const initialTiers = [
  { tier: "Bronze", baseline: 40 },
  { tier: "Silver", baseline: 55 },
  { tier: "Gold", baseline: 70 },
  { tier: "Platinum", baseline: 82 },
  { tier: "Elite", baseline: 92 },
];

export function SettingsScreen() {
  const nav = useNavigation<any>();
  const { data, updatePreference, updateTierBounds } = useAppState();
  const prefs = data.settings.preferences;
  const tier = data.settings.tier;
  const baselines = initialTiers.map((t, i) => ({
    ...t,
    baseline: Math.round(
      (tier.potPctLowerBounds[Math.min(i, 3)] +
        tier.posPctLowerBounds[Math.min(i, 3)] +
        tier.convPctLowerBounds[Math.min(i, 3)]) /
        3
    ),
  }));

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
        {/* Tier Baselines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tier Baselines</Text>
          <View style={styles.card}>
            {baselines.map((t, i) => (
              <View key={t.tier} style={styles.baselineRow}>
                <View style={styles.baselineHeader}>
                  <TierBadge tier={t.tier as any} />
                  <Text style={styles.baselineValue}>{t.baseline}<Text style={styles.baselineUnit}>%</Text></Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={t.baseline}
                  disabled={i > 3}
                  onValueChange={(v) => {
                    if (i <= 3) {
                      updateTierBounds("potPctLowerBounds", i, v);
                      updateTierBounds("posPctLowerBounds", i, v);
                      updateTierBounds("convPctLowerBounds", i, v);
                    }
                  }}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                />
              </View>
            ))}
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
  slider: {
    height: 40,
    width: "100%",
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
});
