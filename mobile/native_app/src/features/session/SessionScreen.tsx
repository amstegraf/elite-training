import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { PoolBall } from "../../ui/PoolBall";
import { colors } from "../../core/theme/theme";
import { Pause, Play, Undo2, Square, Flag, X, Check, Crosshair } from "lucide-react-native";
import { useAppState } from "../../data/AppStateContext";
import { inferBallsCleared, sessionDurationSeconds } from "../../domain/metrics";
import { MissOutcome, MissType } from "../../domain/types";

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
  const route = useRoute<any>();
  const {
    data,
    activeSessions,
    startSession,
    endSession,
    startRack,
    endRack,
    logMiss,
    undoLastMiss,
  } = useAppState();
  const [sessionId, setSessionId] = useState<string | null>(route.params?.sessionId ?? null);
  const [secondsTick, setSecondsTick] = useState(0);
  const [running, setRunning] = useState(true);
  const [ball, setBall] = useState<number>(3);
  const [miss, setMiss] = useState<MissType[]>(["alignment"]);
  const [outcome, setOutcome] = useState<MissOutcome>("playable");
  const [showEndRack, setShowEndRack] = useState(false);
  const [ballsCleared, setBallsCleared] = useState(0);

  useEffect(() => {
    if (route.params?.sessionId) {
      setSessionId(route.params.sessionId);
    }
  }, [route.params?.sessionId]);

  useEffect(() => {
    if (sessionId) return;
    if (activeSessions[0]) {
      setSessionId(activeSessions[0].id);
      return;
    }
    const id = startSession();
    if (id) setSessionId(id);
  }, [activeSessions, sessionId, startSession]);

  const session = useMemo(
    () => data.sessions.find((s) => s.id === sessionId) ?? null,
    [data.sessions, sessionId]
  );
  const currentRack = useMemo(
    () => session?.racks.find((r) => r.id === session.currentRackId) ?? null,
    [session]
  );

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSecondsTick((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const seconds = session ? sessionDurationSeconds(session) + secondsTick : 0;
  const rackNo = currentRack?.rackNumber ?? (session?.racks.length ?? 0) + 1;
  const rackMisses = currentRack?.misses.length ?? 0;
  const inferredPots = currentRack ? inferBallsCleared({ ...currentRack, ballsCleared: undefined }) : 0;
  const rackPots = currentRack ? Math.max(0, Math.min(9, inferredPots === 9 ? ball - 1 : inferredPots)) : 0;

  return (
    <View style={styles.container}>
      <AppHeader
        subtitle="Live Session"
        title={`Rack ${rackNo}`}
        back
        right={
          <TouchableOpacity
            style={styles.endButton}
            onPress={() => {
              if (!session) return;
              if (session.currentRackId) {
                endRack(session.id, ballsCleared);
              }
              endSession(session.id);
              nav.navigate("Report", { sessionId: session.id });
            }}
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
                <Text style={styles.statValue}>{rackPots}/9</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Pots</Text>
                <Text style={[styles.statValue, { color: colors.accent }]}>{rackPots}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Misses</Text>
                <Text style={styles.statValue}>{rackMisses}</Text>
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
                onPress={() =>
                  setMiss((prev) =>
                    prev.includes(m.id as MissType)
                      ? prev.filter((x) => x !== m.id)
                      : [...prev, m.id as MissType]
                  )
                }
                style={[styles.chip, miss.includes(m.id as MissType) && styles.chipActive]}
              >
                <Crosshair size={14} color={miss.includes(m.id as MissType) ? colors.primaryForeground : colors.foreground} />
                <Text style={[styles.chipText, miss.includes(m.id as MissType) && styles.chipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Outcome */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Position Outcome</Text>
          <View style={styles.outcomeGrid}>
            {outcomes.map((o) => {
              const outcomeValue =
                o.id === "potmiss"
                  ? "pot_miss"
                  : o.id === "noshot"
                    ? "no_shot_position"
                    : "playable";
              const active = outcome === outcomeValue;
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
                  onPress={() => setOutcome(outcomeValue as MissOutcome)}
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
          <TouchableOpacity
            style={styles.logMissBtn}
            activeOpacity={0.9}
            onPress={() => {
              if (!session || !session.currentRackId) return;
              if (miss.length === 0) return;
              logMiss(session.id, ball, miss, outcome);
            }}
          >
            <X size={20} color={colors.foreground} strokeWidth={2.6} />
            <Text style={styles.logMissText}>Log Miss</Text>
          </TouchableOpacity>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionSecondary}
              onPress={() => session && undoLastMiss(session.id)}
            >
              <Undo2 size={16} color={colors.foreground} />
              <Text style={styles.actionSecondaryText}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionSecondary}
              onPress={() => session && startRack(session.id)}
            >
              <Play size={14} color={colors.foreground} fill={colors.foreground} />
              <Text style={styles.actionSecondaryText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionPrimary}
              onPress={() => {
                if (!session || !session.currentRackId) return;
                setShowEndRack(true);
              }}
            >
              <Flag size={14} color={colors.primaryForeground} />
              <Text style={styles.actionPrimaryText}>End Rack</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showEndRack} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Balls Cleared</Text>
            <View style={styles.modalGrid}>
              {Array.from({ length: 10 }, (_, i) => i).map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.modalBall, ballsCleared === n && styles.modalBallActive]}
                  onPress={() => setBallsCleared(n)}
                >
                  <Text style={[styles.modalBallText, ballsCleared === n && styles.modalBallTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowEndRack(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => {
                  if (!session) return;
                  endRack(session.id, ballsCleared);
                  setShowEndRack(false);
                }}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
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
    marginBottom: 12,
  },
  modalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalBall: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBallActive: {
    backgroundColor: colors.primary,
  },
  modalBallText: {
    color: colors.foreground,
    fontFamily: "Inter_600SemiBold",
  },
  modalBallTextActive: {
    color: colors.primaryForeground,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
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
