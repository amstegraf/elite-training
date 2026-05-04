import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { AppHeader } from "../../ui/AppHeader";
import { colors } from "../../core/theme/theme";
import { Beaker, Info } from "lucide-react-native";

const APP_VERSION_LABEL = "v1.0.0-beta";

export function AboutScreen() {
  return (
    <View style={styles.container}>
      <AppHeader title="About" subtitle="Cue Path" back />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Info size={20} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Cue Path Beta</Text>
          <Text style={styles.heroBody}>
            You are using a beta version of Cue Path. Features and visuals may evolve as we keep improving the app.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>App version</Text>
            <Text style={styles.rowValue}>{APP_VERSION_LABEL}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Beaker size={14} color={colors.mutedForeground} />
              <Text style={styles.rowLabel}>Release channel</Text>
            </View>
            <Text style={styles.rowValueMuted}>Beta</Text>
          </View>
        </View>

        <Text style={styles.footnote}>
          Thanks for testing early. Your feedback helps us polish the training experience.
        </Text>
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
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(26, 117, 80, 0.2)",
    backgroundColor: "rgba(26, 117, 80, 0.08)",
    padding: 16,
  },
  heroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(26, 117, 80, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
  },
  heroBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  card: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowLabel: {
    fontSize: 14,
    color: colors.foreground,
    fontFamily: "Inter_600SemiBold",
  },
  rowValue: {
    fontSize: 13,
    color: colors.primary,
    fontFamily: "Inter_700Bold",
  },
  rowValueMuted: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  footnote: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
});
