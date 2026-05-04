/**
 * Historical patch snapshot: Dashboard "Recent Trainings" section
 * Removed to reduce dashboard crowding.
 *
 * Source file when removed:
 * - src/features/dashboard/DashboardScreen.tsx
 */

/*
// Import that was used by the removed section:
import { computeSessionMetrics, completedSessionsSorted, formatDurationLabel } from "../../domain/metrics";

// State that was used by the removed section:
const { completedSessions } = useAppState();
const recent = completedSessionsSorted(completedSessions).slice(0, 5);
*/

/*
// JSX block that was removed from DashboardScreen:
<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>Recent Trainings</Text>
    <TouchableOpacity onPress={() => nav.navigate("HistoryTab")} style={styles.sectionLinkRow}>
      <Text style={styles.sectionLink}>All</Text>
      <ChevronRight size={14} color={colors.primary} />
    </TouchableOpacity>
  </View>

  <View style={styles.recentList}>
    {recent.map((s) => {
      const derived = computeSessionMetrics(s);
      const pot = derived.potRate === null ? 0 : Math.round(derived.potRate * 100);
      const pos = derived.positionRate === null ? 0 : Math.round(derived.positionRate * 100);
      const conv = derived.rackConversionRate === null ? 0 : Math.round(derived.rackConversionRate * 100);
      const d = new Date(s.startedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return (
        <TouchableOpacity key={s.id} style={styles.recentItem} activeOpacity={0.8} onPress={() => nav.navigate("Report", { sessionId: s.id })}>
          <View style={styles.recentLeft}>
            <View style={styles.recentIcon}>
              <Target size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.recentDate}>{d}</Text>
              <Text style={styles.recentDur}>{formatDurationLabel(derived.durationSeconds)} · {derived.totalRacks} racks</Text>
            </View>
          </View>
          <View style={styles.recentRight}>
            <View style={styles.recentStatsRow}>
              <Text style={styles.recentStatLabel}>POT</Text>
              <Text style={styles.recentStatValue}>
                {pot}
                <Text style={styles.recentScoreUnit}>%</Text>
              </Text>
            </View>
            <View style={styles.recentStatsRow}>
              <Text style={styles.recentStatLabel}>POS</Text>
              <Text style={styles.recentStatValue}>
                {pos}
                <Text style={styles.recentScoreUnit}>%</Text>
              </Text>
            </View>
            <View style={styles.recentStatsRow}>
              <Text style={styles.recentStatLabel}>CONV</Text>
              <Text style={styles.recentStatValue}>
                {conv}
                <Text style={styles.recentScoreUnit}>%</Text>
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    })}
    {recent.length === 0 && (
      <View style={styles.recentItem}>
        <Text style={styles.recentDur}>No completed sessions yet.</Text>
      </View>
    )}
  </View>
</View>
*/

/*
// Styles that were removed:
recentList: {
  gap: 8,
},
recentItem: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: colors.card,
  borderRadius: 24,
  padding: 16,
  borderWidth: 1,
  borderColor: "rgba(226, 224, 221, 0.6)",
},
recentLeft: {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
},
recentIcon: {
  height: 44,
  width: 44,
  borderRadius: 16,
  backgroundColor: "rgba(26, 117, 80, 0.1)",
  alignItems: "center",
  justifyContent: "center",
},
recentDate: {
  fontSize: 14,
  fontFamily: "Inter_600SemiBold",
  color: colors.foreground,
},
recentDur: {
  fontSize: 12,
  color: colors.mutedForeground,
  marginTop: 2,
},
recentRight: {
  alignItems: "flex-end",
  gap: 2,
},
recentStatsRow: {
  flexDirection: "row",
  alignItems: "baseline",
  gap: 6,
},
recentStatLabel: {
  fontSize: 10,
  fontFamily: "Inter_600SemiBold",
  color: colors.mutedForeground,
  letterSpacing: 0.4,
},
recentStatValue: {
  fontSize: 14,
  fontFamily: "Sora_700Bold",
  color: colors.foreground,
},
recentScore: {
  fontSize: 18,
  fontFamily: "Sora_700Bold",
  color: colors.foreground,
},
recentScoreUnit: {
  fontSize: 12,
  color: colors.mutedForeground,
},
recentScoreLabel: {
  fontSize: 10,
  fontFamily: "Inter_600SemiBold",
  color: colors.mutedForeground,
  letterSpacing: 0.5,
},
*/
