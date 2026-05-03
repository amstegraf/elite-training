import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { PoolBall } from "../../ui/PoolBall";
import { colors } from "../../core/theme/theme";
import { Pause, Play, Undo2, Square, Flag, X, Check, Crosshair } from "lucide-react-native";

const missTypes = [
  { id: "position", label: "Position" },
  { id: "alignment", label: "Alignment" },
  { id: "delivery", label: "Delivery" },
  { id: "speed", label: "Speed" },
];

const outcomes = [
  { id: "playable", label: "Playable", tone: "success" },
  { id: "potmiss", label: "Pot Miss", tone: "destructive" },
  { id: "noshot", label: "No Shot", tone: "warning" },
];

const fmt = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
};

export function SessionScreen() {
  const nav = useNavigation<any>();
  const [seconds, setSeconds] = useState(847);
  const [running, setRunning] = useState(true);
  const [ball, setBall] = useState<number>(3);
  const [miss, setMiss] = useState<string | null>("alignment");
  const [outcome, setOutcome] = useState<string | null>("playable");
  const [rack, setRack] = useState({ no: 4, balls: 7, pots: 5, misses: 2 });

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  return (
    <View style={styles.container}>
      <AppHeader
        subtitle="Live Session"
        title={`Rack ${rack.no}`}
        back
        right={
          <TouchableOpacity
            style={styles.endButton}
            onPress={() => nav.navigate("Report")}
          >
            <Square size={14} color={colors.danger} fill={colors.danger} />
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Timer Hero */}
        <View style={styles.section}>
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />
            <View style={styles.timerRow}>
              <View>
                <Text style={styles.timerLabel}>Elapsed</Text>
                <Text style={styles.timerValue}>{fmt(seconds)}</Text>
              </View>
              <TouchableOpacity
                style={styles.playPauseBtn}
                onPress={() => setRunning((r) => !r)}
              >
                {running ? (
                  <Pause size={22} color={colors.primaryForeground} fill={colors.primaryForeground} />
                ) : (
                  <Play size={22} color={colors.primaryForeground} fill={colors.primaryForeground} style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Balls</Text>
                <Text style={styles.statValue}>{rack.pots}/{rack.balls}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Pots</Text>
                <Text style={[styles.statValue, { color: colors.accent }]}>{rack.pots}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Misses</Text>
                <Text style={styles.statValue}>{rack.misses}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Object Ball Selector */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Object Ball</Text>
            <Text style={styles.sectionHint}>Tap to select</Text>
          </View>
          <View style={styles.ballCard}>
            <View style={styles.ballGrid}>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <PoolBall
                  key={n}
                  number={n}
                  size="sm"
                  active={ball === n}
                  onPress={() => setBall(n)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Miss Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Miss Type</Text>
          <View style={styles.chipRow}>
            {missTypes.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setMiss(m.id)}
                style={[styles.chip, miss === m.id && styles.chipActive]}
              >
                <Crosshair size={14} color={miss === m.id ? colors.primaryForeground : colors.foreground} />
                <Text style={[styles.chipText, miss === m.id && styles.chipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Outcome */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Position Outcome</Text>
          <View style={styles.outcomeGrid}>
            {outcomes.map((o) => {
              const active = outcome === o.id;
              let toneStyle = {};
              let textStyle = {};
              if (active) {
                if (o.tone === "success") { toneStyle = { backgroundColor: colors.primary, borderColor: colors.primary }; textStyle = { color: colors.primaryForeground }; }
                if (o.tone === "destructive") { toneStyle = { backgroundColor: colors.danger, borderColor: colors.danger }; textStyle = { color: colors.primaryForeground }; }
                if (o.tone === "warning") { toneStyle = { backgroundColor: colors.warning, borderColor: colors.warning }; textStyle = { color: colors.foreground }; }
              }

              return (
                <TouchableOpacity
                  key={o.id}
                  onPress={() => setOutcome(o.id)}
                  style={[styles.outcomeChip, active && toneStyle]}
                >
                  {o.id === "playable" && <Check size={16} color={active ? colors.primaryForeground : colors.foreground} />}
                  {o.id === "potmiss" && <X size={16} color={active ? colors.primaryForeground : colors.foreground} />}
                  {o.id === "noshot" && <Flag size={16} color={active ? colors.foreground : colors.foreground} />}
                  <Text style={[styles.outcomeText, active && textStyle]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.logMissBtn} activeOpacity={0.9}>
            <X size={20} color={colors.foreground} strokeWidth={2.6} />
            <Text style={styles.logMissText}>Log Miss</Text>
          </TouchableOpacity>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionSecondary}>
              <Undo2 size={16} color={colors.foreground} />
              <Text style={styles.actionSecondaryText}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionSecondary}
              onPress={() => setRack((r) => ({ ...r, no: r.no, balls: 9, pots: 0, misses: 0 }))}
            >
              <Play size={14} color={colors.foreground} fill={colors.foreground} />
              <Text style={styles.actionSecondaryText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionPrimary}
              onPress={() => setRack((r) => ({ ...r, no: r.no + 1, pots: 0, misses: 0 }))}
            >
              <Flag size={14} color={colors.primaryForeground} />
              <Text style={styles.actionPrimaryText}>End Rack</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  endButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 16,
    gap: 6,
  },
  endButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  section: { marginBottom: 20 },
  heroCard: {
    backgroundColor: "#164c36",
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: 20,
    left: 20,
    height: 120,
    width: 120,
    borderRadius: 60,
    backgroundColor: "rgba(32, 181, 118, 0.3)",
    opacity: 0.5,
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timerLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 2,
    color: "rgba(247, 245, 240, 0.7)",
  },
  timerValue: {
    fontSize: 48,
    fontFamily: "Sora_800ExtraBold",
    color: colors.primaryForeground,
    marginTop: 4,
  },
  playPauseBtn: {
    height: 56,
    width: 56,
    borderRadius: 16,
    backgroundColor: "rgba(247, 245, 240, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(247, 245, 240, 0.1)",
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "rgba(247, 245, 240, 0.6)",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Sora_700Bold",
    color: colors.primaryForeground,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Sora_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  ballCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  ballGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.foreground,
  },
  chipTextActive: {
    color: colors.primaryForeground,
  },
  outcomeGrid: {
    flexDirection: "row",
    gap: 8,
  },
  outcomeChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    borderRadius: 999,
    gap: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  outcomeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: colors.foreground,
  },
  actionBar: {
    marginTop: 24,
    gap: 12,
  },
  logMissBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    height: 56,
    borderRadius: 16,
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  logMissText: {
    fontSize: 16,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 8,
  },
  actionSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
    height: 48,
    borderRadius: 16,
    gap: 6,
  },
  actionSecondaryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.foreground,
  },
  actionPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 16,
    gap: 6,
  },
  actionPrimaryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.primaryForeground,
  },
});
