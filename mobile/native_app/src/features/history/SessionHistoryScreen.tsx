import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { Chip } from "../../ui/Chip";
import { colors } from "../../core/theme/theme";
import { Filter, Target, ChevronRight } from "lucide-react-native";

const sessions = [
  { date: "Today", time: "09:42", dur: "48m", racks: 6, pot: 81, pos: 68, rack: 50 },
  { date: "Yesterday", time: "18:10", dur: "32m", racks: 4, pot: 74, pos: 60, rack: 38 },
  { date: "Mon, Apr 28", time: "10:05", dur: "55m", racks: 7, pot: 69, pos: 64, rack: 42 },
  { date: "Sun, Apr 27", time: "08:30", dur: "1h 12m", racks: 9, pot: 78, pos: 70, rack: 55 },
  { date: "Fri, Apr 25", time: "19:48", dur: "40m", racks: 5, pot: 72, pos: 62, rack: 40 },
  { date: "Thu, Apr 24", time: "08:15", dur: "28m", racks: 3, pot: 65, pos: 58, rack: 33 },
];

export function SessionHistoryScreen() {
  const nav = useNavigation<any>();

  return (
    <View style={styles.container}>
      <AppHeader
        title="History"
        subtitle="All sessions"
        right={
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
            <Filter size={18} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {["All", "This Week", "9-Ball", "8-Ball", "Drills"].map((f, i) => (
            <View key={f} style={{ marginRight: 8 }}>
              <Chip label={f} active={i === 0} />
            </View>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listScroll} showsVerticalScrollIndicator={false}>
        {sessions.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => nav.navigate("Report")}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <View style={styles.iconContainer}>
                  <Target size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.dateText}>{s.date}</Text>
                  <Text style={styles.metaText}>{s.time} · {s.dur} · {s.racks} racks</Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.miniStat}>
                <Text style={styles.miniLabel}>POT</Text>
                <Text style={styles.miniValue}>{s.pot}<Text style={styles.miniUnit}>%</Text></Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniLabel}>POS</Text>
                <Text style={styles.miniValue}>{s.pos}<Text style={styles.miniUnit}>%</Text></Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniLabel}>RACK</Text>
                <Text style={styles.miniValue}>{s.rack}<Text style={styles.miniUnit}>%</Text></Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterButton: {
    height: 40,
    width: 40,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersScroll: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  listScroll: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 8,
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    height: 48,
    width: 48,
    borderRadius: 16,
    backgroundColor: "rgba(26, 117, 80, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  miniStat: {
    flex: 1,
    backgroundColor: "rgba(235, 232, 225, 0.6)",
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.muted,
  },
  miniValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  miniUnit: {
    fontSize: 10,
    color: colors.muted,
  },
});
