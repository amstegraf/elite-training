import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { GameTypeModal } from "../../ui/GameTypeModal";
import { PoolBall } from "../../ui/PoolBall";
import { colors } from "../../core/theme/theme";
import { Pause, Play, Undo2, Square, Flag, X, Check, Crosshair } from "lucide-react-native";
import { useAppState } from "../../data/AppStateContext";
import {
  inferBallsCleared,
  sessionDurationSeconds,
  suggestedNextBallNumber,
} from "../../domain/metrics";
import { MissOutcome, MissType } from "../../domain/types";

const missTypes = [
  { id: "position", label: "Position" },
  { id: "alignment", label: "Alignment" },
  { id: "delivery", label: "Delivery" },
  { id: "speed", label: "Speed" },
  { id: "scratch", label: "Scratch" },
];

const outcomes = [
  { id: "playable", label: "Playable", tone: "success" },
  { id: "noshot", label: "No Shot", tone: "warning" },
  { id: "potmiss", label: "Pot Miss", tone: "destructive" },
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
    toggleSessionPause,
  } = useAppState();
  const [sessionId, setSessionId] = useState<string | null>(route.params?.sessionId ?? null);
  const [, setTick] = useState(0);
  const [ball, setBall] = useState<number>(3);
  const [miss, setMiss] = useState<MissType>("alignment");
  const [outcome, setOutcome] = useState<MissOutcome>("playable");
  const [showEndRack, setShowEndRack] = useState(false);
  const [showGameTypeModal, setShowGameTypeModal] = useState(false);
  const [clearedBalls, setClearedBalls] = useState<number[]>([]);
  const logBtnScale = useRef(new Animated.Value(1)).current;
  const missStatScale = useRef(new Animated.Value(1)).current;
  const potStatScale = useRef(new Animated.Value(1)).current;

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
    setShowGameTypeModal(true);
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
    const t = setInterval(() => setTick((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const seconds = session ? sessionDurationSeconds(session) : 0;
  const rackNo = currentRack?.rackNumber ?? (session?.racks.length ?? 0) + 1;
  const sessionBallCount = session?.ballCount ?? 9;
  const rackMisses = currentRack?.misses.length ?? 0;
  const suggestedBall = suggestedNextBallNumber(currentRack, sessionBallCount);
  const inferredPots = currentRack ? inferBallsCleared(currentRack, sessionBallCount) : 0;
  const rackPots = currentRack ? Math.max(0, Math.min(sessionBallCount, inferredPots === 0 ? suggestedBall - 1 : inferredPots)) : 0;
  const selectorBallSize = sessionBallCount >= 10 ? "xs" : "sm";
  const hasOpenRack = Boolean(session?.currentRackId);
  const canStartRack = Boolean(session) && !hasOpenRack;
  const canEndRack = Boolean(session) && hasOpenRack;
  const loggedMissBalls = useMemo(() => {
    const set = new Set<number>();
    (currentRack?.misses ?? []).forEach((entry) => {
      set.add(entry.ballNumber);
    });
    return set;
  }, [currentRack?.misses]);
  const previousRacks = useMemo(() => {
    const rows = (session?.racks ?? [])
      .filter((rack) => Boolean(rack.endedAt))
      .map((rack) => {
        const balls = sessionBallCount;
        const pots = Math.max(0, Math.min(sessionBallCount, inferBallsCleared(rack, sessionBallCount)));
        const misses = rack.misses.length;
        const skipped = Math.max(0, balls - pots - misses);
        const pct = balls > 0 ? Math.round((pots / balls) * 100) : 0;
        const startMs = new Date(rack.startedAt).getTime();
        const endMs = new Date(rack.endedAt ?? rack.startedAt).getTime();
        const durationSeconds = Number.isFinite(startMs) && Number.isFinite(endMs)
          ? Math.max(0, Math.floor((endMs - startMs) / 1000))
          : 0;
        return {
          id: rack.id,
          rackNumber: rack.rackNumber,
          balls,
          pots,
          misses,
          skipped,
          pct,
          durationSeconds,
        };
      })
      .sort((a, b) => b.rackNumber - a.rackNumber);
    return rows;
  }, [session?.racks, sessionBallCount]);

  useEffect(() => {
    if (currentRack) {
      setBall(suggestedNextBallNumber(currentRack, sessionBallCount));
    }
  }, [currentRack?.id, currentRack?.misses.length, sessionBallCount]);

  useEffect(() => {
    setBall((prev) => Math.min(Math.max(1, prev), sessionBallCount));
  }, [sessionBallCount]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(missStatScale, {
        toValue: 1.12,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(missStatScale, {
        toValue: 1,
        duration: 160,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [rackMisses, missStatScale]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(potStatScale, {
        toValue: 1.08,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(potStatScale, {
        toValue: 1,
        duration: 160,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [rackPots, potStatScale]);

  const animateLogMissFeedback = () => {
    Animated.sequence([
      Animated.timing(logBtnScale, {
        toValue: 0.96,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(logBtnScale, {
        toValue: 1,
        friction: 4,
        tension: 170,
        useNativeDriver: true,
      }),
    ]).start();
  };

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
                Alert.alert("End rack first", "Close the current rack before ending the session.");
                return;
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
                onPress={() =>
                  session && toggleSessionPause(session.id, !(session.isPaused ?? false))
                }
              >
                {!(session?.isPaused ?? false) ? (
                  <Pause size={22} color={colors.primaryForeground} fill={colors.primaryForeground} />
                ) : (
                  <Play size={22} color={colors.primaryForeground} fill={colors.primaryForeground} style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Balls</Text>
                <Text style={styles.statValue}>{rackPots}/{sessionBallCount}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Pots</Text>
                <Animated.Text style={[styles.statValue, styles.statValueAccent, { transform: [{ scale: potStatScale }] }]}>
                  {rackPots}
                </Animated.Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Misses</Text>
                <Animated.Text style={[styles.statValue, { transform: [{ scale: missStatScale }] }]}>
                  {rackMisses}
                </Animated.Text>
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
              {Array.from({ length: sessionBallCount }, (_, i) => i + 1).map((n) => (
                <PoolBall
                  key={n}
                  number={n}
                  size={selectorBallSize}
                  active={ball === n}
                  hasLoggedMiss={loggedMissBalls.has(n)}
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
            {missTypes.slice(0, 3).map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() =>
                  setMiss((prev) =>
                    m.id as MissType
                  )
                }
                style={[styles.chip, miss === (m.id as MissType) && styles.chipActive]}
              >
                <Crosshair size={14} color={miss === (m.id as MissType) ? colors.primaryForeground : colors.foreground} />
                <Text style={[styles.chipText, miss === (m.id as MissType) && styles.chipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.chipRow, styles.chipRowCentered]}>
            {missTypes.slice(3).map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() =>
                  setMiss((prev) =>
                    m.id as MissType
                  )
                }
                style={[styles.chip, styles.chipNarrow, miss === (m.id as MissType) && styles.chipActive]}
              >
                <Crosshair size={14} color={miss === (m.id as MissType) ? colors.primaryForeground : colors.foreground} />
                <Text style={[styles.chipText, miss === (m.id as MissType) && styles.chipTextActive]}>{m.label}</Text>
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
          <Animated.View style={{ transform: [{ scale: logBtnScale }] }}>
          <TouchableOpacity
            style={styles.logMissBtn}
            activeOpacity={0.9}
            onPress={() => {
              if (!session || !session.currentRackId) return;
              logMiss(session.id, ball, [miss], outcome);
              if (outcome === "pot_miss") {
                const preselected = Array.from({ length: Math.max(0, ball - 1) }, (_, i) => i + 1)
                  .filter((n) =>
                    !currentRack?.misses.some((m) => m.ballNumber === n && m.outcome === "pot_miss")
                  );
                setClearedBalls(preselected);
                setShowEndRack(true);
              }
              animateLogMissFeedback();
            }}
          >
            <X size={20} color={colors.foreground} strokeWidth={2.6} />
            <Text style={styles.logMissText}>Log Miss</Text>
          </TouchableOpacity>
          </Animated.View>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionSecondary}
              onPress={() => session && undoLastMiss(session.id)}
            >
              <Undo2 size={16} color={colors.foreground} />
              <Text style={styles.actionSecondaryText}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionSecondary, !canStartRack && styles.actionDisabled]}
              disabled={!canStartRack}
              onPress={() => session && startRack(session.id)}
            >
              <Play size={14} color={colors.foreground} fill={colors.foreground} />
              <Text style={styles.actionSecondaryText}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionPrimary, !canEndRack && styles.actionPrimaryDisabled]}
              disabled={!canEndRack}
              onPress={() => {
                if (!session || !session.currentRackId) return;
                const guessed = suggestedNextBallNumber(currentRack) - 1;
                const preselected = Array.from({ length: Math.max(0, guessed) }, (_, i) => i + 1)
                  .filter((n) =>
                    !currentRack?.misses.some((m) => m.ballNumber === n && m.outcome === "pot_miss")
                  );
                setClearedBalls(preselected);
                setShowEndRack(true);
              }}
            >
              <Flag size={14} color={colors.primaryForeground} />
              <Text style={styles.actionPrimaryText}>End Rack</Text>
            </TouchableOpacity>
          </View>
        </View>

        {previousRacks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.previousHeader}>
              <Text style={styles.sectionTitle}>Previous Racks</Text>
              <Text style={styles.previousHeaderMeta}>{previousRacks.length} played</Text>
            </View>
            <View style={styles.previousList}>
              {previousRacks.map((rack) => {
                const pctToneStyle =
                  rack.pct >= 90
                    ? styles.pctPillGood
                    : rack.pct >= 70
                      ? styles.pctPillPrimary
                      : rack.pct >= 50
                        ? styles.pctPillWarn
                        : styles.pctPillBad;
                return (
                  <View key={rack.id} style={styles.previousCard}>
                    <View style={styles.previousRackBadge}>
                      <Text style={styles.previousRackBadgeText}>#{rack.rackNumber}</Text>
                    </View>
                    <View style={styles.previousContent}>
                      <View style={styles.previousTopRow}>
                        <Text style={styles.previousTitle}>
                          {rack.pots}/{rack.balls} <Text style={styles.previousTitleMuted}>pots</Text>
                        </Text>
                        <View style={styles.conversionWrap}>
                          <Text style={styles.conversionLabel}>Conversion</Text>
                          <View style={[styles.pctPill, pctToneStyle]}>
                            <Text style={styles.pctPillText}>{rack.pct}%</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.previousBarTrack}>
                        {rack.pots > 0 && (
                          <View style={[styles.previousBarPot, { width: `${(rack.pots / rack.balls) * 100}%` }]} />
                        )}
                        {rack.misses > 0 && (
                          <View style={[styles.previousBarMiss, { width: `${(rack.misses / rack.balls) * 100}%` }]} />
                        )}
                        {rack.skipped > 0 && (
                          <View style={[styles.previousBarSkip, { width: `${(rack.skipped / rack.balls) * 100}%` }]} />
                        )}
                      </View>
                      <View style={styles.previousMetaRow}>
                        <View style={styles.previousMetaDots}>
                          <View style={styles.previousMetaItem}>
                            <View style={styles.previousDotPot} />
                            <Text style={styles.previousMetaText}>{rack.pots}</Text>
                          </View>
                          <View style={styles.previousMetaItem}>
                            <View style={styles.previousDotMiss} />
                            <Text style={styles.previousMetaText}>{rack.misses}</Text>
                          </View>
                        </View>
                        <Text style={styles.previousMetaText}>{fmt(rack.durationSeconds)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={showEndRack} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Balls potted</Text>
            <View style={styles.modalGrid}>
              {Array.from({ length: sessionBallCount }, (_, i) => i + 1).map((n) => (
                <PoolBall
                  key={n}
                  number={n}
                  size={selectorBallSize}
                  active={clearedBalls.includes(n)}
                  onPress={() =>
                    setClearedBalls((prev) =>
                      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b)
                    )
                  }
                />
              ))}
            </View>
            <Text style={styles.modalHint}>{clearedBalls.length} balls cleared</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowEndRack(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => {
                  if (!session) return;
                  endRack(session.id, clearedBalls.length);
                  setShowEndRack(false);
                }}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <GameTypeModal
        visible={showGameTypeModal}
        onSelect={(ballCount) => {
          setShowGameTypeModal(false);
          const id = startSession(ballCount);
          if (id) setSessionId(id);
        }}
        onCancel={() => {
          setShowGameTypeModal(false);
          nav.navigate("Home");
        }}
      />
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
  statValueAccent: {
    color: colors.accent,
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
    flexWrap: "nowrap",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  chipRowCentered: {
    justifyContent: "center",
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
    flex: 1,
  },
  chipNarrow: {
    flex: 0.42,
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
  actionDisabled: {
    opacity: 0.45,
  },
  actionPrimaryDisabled: {
    opacity: 0.55,
  },
  previousHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  previousHeaderMeta: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  previousList: {
    gap: 10,
  },
  previousCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.65)",
    padding: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  previousRackBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  previousRackBadgeText: {
    fontSize: 20,
    lineHeight: 22,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
  },
  previousContent: {
    flex: 1,
  },
  previousTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  conversionWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  conversionLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  previousTitle: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  previousTitleMuted: {
    fontSize: 14,
    lineHeight: 16,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  pctPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pctPillGood: {
    backgroundColor: colors.primary,
  },
  pctPillPrimary: {
    backgroundColor: colors.primary,
  },
  pctPillWarn: {
    backgroundColor: colors.warning,
  },
  pctPillBad: {
    backgroundColor: colors.danger,
  },
  pctPillText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  previousBarTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(120,126,145,0.18)",
    flexDirection: "row",
    marginBottom: 6,
  },
  previousBarPot: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  previousBarMiss: {
    height: "100%",
    backgroundColor: colors.danger,
  },
  previousBarSkip: {
    height: "100%",
    backgroundColor: "rgba(120,126,145,0.35)",
  },
  previousMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previousMetaDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previousMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  previousMetaText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  previousDotPot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  previousDotMiss: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
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
    flexWrap: "nowrap",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalHint: {
    marginTop: 10,
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_600SemiBold",
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
