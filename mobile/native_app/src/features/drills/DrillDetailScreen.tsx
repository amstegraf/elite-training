import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Check, RotateCcw, Sparkles, Target, Timer, Trophy, X } from "lucide-react-native";
import { AppHeader } from "../../ui/AppHeader";
import { colors } from "../../core/theme/theme";
import { getDrillById } from "../../data/drills";
import { DrillDefinition, DrillDifficulty } from "../../domain/drills";
import { DrillPoolTable } from "./components/PoolTable";

type AttemptResult = "completed" | "failed";

const difficultyLabel = (difficulty: DrillDifficulty) =>
  difficulty === 1 ? "Easy" : difficulty === 2 ? "Medium" : "Hard";

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

function DifficultyStars({ level }: { level: DrillDifficulty }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3].map((idx) => (
        <Sparkles
          key={idx}
          size={13}
          color={idx <= level ? colors.tierGold : "rgba(120, 126, 145, 0.45)"}
        />
      ))}
    </View>
  );
}

function finishedLabel(stars: number): string {
  if (stars >= 3) return "Legendary";
  if (stars === 2) return "Great run";
  if (stars === 1) return "Keep grinding";
  return "Try again";
}

function useDrillState(drill: DrillDefinition | null) {
  const [active, setActive] = useState(false);
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const startRef = useRef<number | null>(null);
  const attemptLimit = drill?.rules.attemptLimit ?? 0;
  const done = results.length;
  const completed = results.filter((item) => item === "completed").length;
  const finished = active && done >= attemptLimit && attemptLimit > 0;

  useEffect(() => {
    if (finished) setShowResultModal(true);
  }, [finished]);

  useEffect(() => {
    if (!active || finished) return;
    if (startRef.current === null) {
      startRef.current = Date.now() - elapsed * 1000;
    }
    const timer = setInterval(() => {
      if (startRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [active, finished, elapsed]);

  const resetRun = () => {
    startRef.current = Date.now();
    setElapsed(0);
    setResults([]);
    setShowResultModal(false);
  };

  return {
    active,
    setActive,
    results,
    setResults,
    elapsed,
    showResultModal,
    setShowResultModal,
    done,
    completed,
    finished,
    resetRun,
    attemptLimit,
  };
}

export function DrillDetailScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const drillId = route.params?.drillId as string | undefined;
  const drill = useMemo(() => (drillId ? getDrillById(drillId) : null), [drillId]);
  const state = useDrillState(drill);

  if (!drill) {
    return (
      <View style={styles.container}>
        <AppHeader title="Drill" subtitle="Not found" back />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Drill not found</Text>
          <Text style={styles.emptyBody}>Return to My Drills and select a valid drill.</Text>
        </View>
      </View>
    );
  }

  const pct = state.attemptLimit > 0 ? (state.completed / state.attemptLimit) * 100 : 0;
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;
  const label = finishedLabel(stars);
  const starScales = useRef([new Animated.Value(0.6), new Animated.Value(0.6), new Animated.Value(0.6)]).current;
  const starOpacity = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    if (!(state.finished && state.showResultModal)) return;
    starScales.forEach((v) => v.setValue(0.6));
    starOpacity.forEach((v) => v.setValue(0));
    const animations = [0, 1, 2].flatMap((idx) => [
      Animated.sequence([
        Animated.delay(idx * 120),
        Animated.timing(starOpacity[idx], { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(idx * 120),
        Animated.spring(starScales[idx], {
          toValue: 1,
          friction: 5,
          tension: 140,
          useNativeDriver: true,
        }),
      ]),
    ]);
    Animated.parallel(animations).start();
  }, [state.finished, state.showResultModal, starOpacity, starScales]);

  const recordAttempt = (result: AttemptResult) => {
    if (state.finished) return;
    state.setResults((prev) => [...prev, result]);
  };

  const start = () => {
    state.resetRun();
    state.setActive(true);
  };

  const restart = () => {
    state.resetRun();
  };

  const done = () => {
    state.setActive(false);
    state.setResults([]);
    state.setShowResultModal(false);
    nav.goBack();
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={drill.name}
        subtitle="Drill"
        back
        right={
          state.active ? (
            <TouchableOpacity style={styles.iconButton} onPress={restart} activeOpacity={0.85}>
              <RotateCcw size={18} color={colors.foreground} />
            </TouchableOpacity>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contextRow}>
          <View style={styles.contextLeft}>
            <DifficultyStars level={drill.difficulty} />
            <Text style={styles.contextText}>{difficultyLabel(drill.difficulty)}</Text>
          </View>
          <View style={styles.contextRight}>
            <Target size={13} color={colors.primary} />
            <Text style={styles.contextText}>{drill.metadata.goal ?? drill.category}</Text>
          </View>
        </View>

        {state.active && (
          <View style={styles.activeCard}>
            <View style={styles.activeSection}>
              <Text style={styles.activeLabel}>Attempts</Text>
              <Text style={styles.activeValue}>
                {Math.min(state.done + (state.finished ? 0 : 1), state.attemptLimit)}
                <Text style={styles.activeValueMuted}>/{state.attemptLimit}</Text>
              </Text>
            </View>
            <View style={styles.dotsRow}>
              {Array.from({ length: state.attemptLimit }).map((_, idx) => {
                const result = state.results[idx];
                return (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      result === "completed" && styles.dotSuccess,
                      result === "failed" && styles.dotFail,
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.activeSection}>
              <Text style={styles.activeLabel}>Time</Text>
              <Text style={styles.activeValue}>{formatTime(state.elapsed)}</Text>
            </View>
          </View>
        )}

        <DrillPoolTable
          balls={drill.balls}
          width={drill.table.coordinateSystem.width}
          height={drill.table.coordinateSystem.height}
          origin={drill.table.coordinateSystem.origin}
        />

        {state.finished && !state.showResultModal && (
          <TouchableOpacity style={styles.banner} onPress={() => state.setShowResultModal(true)} activeOpacity={0.9}>
            <View style={styles.bannerIcon}>
              <Trophy size={18} color={colors.foreground} />
            </View>
            <View style={styles.bannerTextWrap}>
              <Text style={styles.bannerTop}>Drill complete</Text>
              <Text style={styles.bannerMain}>
                {state.completed}/{state.attemptLimit} - {Math.round(pct)}% - {label}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoKicker}>Objective</Text>
          <Text style={styles.infoTitle}>{drill.metadata.objective ?? "Complete drill in order"}</Text>
          <Text style={styles.infoBody}>{drill.description}</Text>
          <View style={styles.focusWrap}>
            {(drill.metadata.focus ?? []).map((focus) => (
              <View key={focus} style={styles.focusChip}>
                <Target size={10} color={colors.primary} />
                <Text style={styles.focusText}>{focus}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statTile}>
            <Text style={styles.statTileLabel}>Attempts</Text>
            <Text style={styles.statTileValue}>{drill.rules.attemptLimit}</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statTileLabel}>Est. time</Text>
            <Text style={styles.statTileValue}>{drill.metadata.estMinutes ?? 8} min</Text>
          </View>
        </View>

        {state.active && !state.finished && (
          <Text style={styles.hintText}>Play the table setup, then mark the result for this attempt.</Text>
        )}

        {!state.active ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={start} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>Start Drill</Text>
          </TouchableOpacity>
        ) : state.finished ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={restart} activeOpacity={0.9}>
              <Text style={styles.secondaryBtnText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtnCompact} onPress={done} activeOpacity={0.9}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.resultBtn, styles.resultFail]}
              onPress={() => recordAttempt("failed")}
              activeOpacity={0.9}
            >
              <X size={18} color={colors.danger} />
              <Text style={styles.resultFailText}>Failed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.resultBtn, styles.resultSuccess]}
              onPress={() => recordAttempt("completed")}
              activeOpacity={0.9}
            >
              <Check size={18} color={colors.primary} />
              <Text style={styles.resultSuccessText}>Completed</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={state.finished && state.showResultModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => state.setShowResultModal(false)}
              activeOpacity={0.85}
            >
              <X size={16} color={colors.foreground} />
            </TouchableOpacity>

            <LinearGradient
              colors={["hsl(40, 95%, 55%)", "hsl(25, 95%, 50%)"]}
              style={styles.modalIconWrap}
            >
              <Trophy size={26} color="#111" strokeWidth={2.5} />
            </LinearGradient>

            <Text style={styles.modalKicker}>Drill complete</Text>
            <Text style={styles.modalTitle}>{label}</Text>

            <View style={styles.modalStars}>
              {[1, 2, 3].map((idx) => (
                <Animated.View
                  key={idx}
                  style={{
                    opacity: starOpacity[idx - 1],
                    transform: [{ scale: starScales[idx - 1] }],
                    shadowColor: idx <= stars ? "hsl(40, 95%, 55%)" : "transparent",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 15,
                  }}
                >
                  <Sparkles
                    size={48}
                    fill={idx <= stars ? "hsl(42, 95%, 50%)" : "rgba(120, 126, 145, 0.15)"}
                    color={idx <= stars ? "hsl(42, 95%, 50%)" : "rgba(120, 126, 145, 0.35)"}
                  />
                </Animated.View>
              ))}
            </View>

            <View style={styles.modalStatsRow}>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatLabel}>Score</Text>
                <Text style={styles.modalStatValue}>{state.completed}<Text style={styles.modalStatValueMuted}>/{state.attemptLimit}</Text></Text>
              </View>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatLabel}>Success</Text>
                <Text style={styles.modalStatValue}>{Math.round(pct)}%</Text>
              </View>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatLabel}>Time</Text>
                <Text style={styles.modalStatValue}>{formatTime(state.elapsed)}</Text>
              </View>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={restart} activeOpacity={0.9}>
                <RotateCcw size={16} color={colors.foreground} />
                <Text style={styles.modalSecondaryBtnText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => state.setShowResultModal(false)}
                activeOpacity={0.9}
              >
                <Text style={styles.modalPrimaryBtnText}>Continue</Text>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 14 },
  iconButton: {
    height: 40,
    width: 40,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: { paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, color: colors.foreground, fontFamily: "Sora_700Bold" },
  emptyBody: { marginTop: 4, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
  contextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  contextLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  contextRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  contextText: { color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  starRow: { flexDirection: "row", gap: 2 },
  activeCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.75)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  activeSection: { alignItems: "center", minWidth: 70 },
  activeLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.mutedForeground,
    fontFamily: "Inter_600SemiBold",
  },
  activeValue: {
    marginTop: 2,
    fontSize: 20,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  activeValueMuted: { color: colors.mutedForeground, fontSize: 16 },
  dotsRow: { flexDirection: "row", gap: 4, flex: 1, justifyContent: "center" },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(120,126,145,0.4)",
    backgroundColor: "transparent",
  },
  dotSuccess: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotFail: { backgroundColor: colors.danger, borderColor: colors.danger },
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(26,117,80,0.35)",
    padding: 12,
    backgroundColor: "rgba(26,117,80,0.09)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tierGold,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextWrap: { flex: 1 },
  bannerTop: {
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontSize: 10,
    color: colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  bannerMain: { marginTop: 2, fontSize: 13, color: colors.foreground, fontFamily: "Inter_600SemiBold" },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  infoKicker: {
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontSize: 10,
    color: colors.mutedForeground,
    fontFamily: "Inter_600SemiBold",
  },
  infoTitle: { marginTop: 3, fontSize: 17, color: colors.foreground, fontFamily: "Sora_700Bold" },
  infoBody: {
    marginTop: 8,
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 19,
    fontFamily: "Inter_500Medium",
  },
  focusWrap: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  focusChip: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  focusText: { fontSize: 11, color: colors.foreground, fontFamily: "Inter_500Medium" },
  statRow: { flexDirection: "row", gap: 10 },
  statTile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 10,
    alignItems: "center",
  },
  statTileLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: colors.mutedForeground,
    fontFamily: "Inter_600SemiBold",
  },
  statTileValue: {
    marginTop: 2,
    fontSize: 18,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  hintText: {
    textAlign: "center",
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  actionRow: { flexDirection: "row", gap: 10 },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  primaryBtnCompact: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  primaryBtnText: { color: colors.primaryForeground, fontFamily: "Sora_700Bold", fontSize: 16 },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
  },
  secondaryBtnText: { color: colors.foreground, fontFamily: "Sora_700Bold", fontSize: 16 },
  resultBtn: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    flexDirection: "row",
    gap: 6,
  },
  resultFail: {
    backgroundColor: "rgba(255,75,75,0.1)",
    borderColor: "rgba(255,75,75,0.45)",
  },
  resultSuccess: {
    backgroundColor: "rgba(32,181,118,0.12)",
    borderColor: "rgba(32,181,118,0.5)",
  },
  resultFailText: { color: colors.danger, fontFamily: "Sora_700Bold", fontSize: 16 },
  resultSuccessText: { color: colors.primary, fontFamily: "Sora_700Bold", fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f3ee",
    zIndex: 5,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    shadowColor: "hsl(40, 95%, 55%)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  modalKicker: {
    marginTop: 20,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontSize: 10,
    color: colors.primary,
    fontFamily: "Inter_700Bold",
  },
  modalTitle: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 28,
    color: "#111",
    fontFamily: "Sora_800ExtraBold",
  },
  modalStars: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  modalStatsRow: { marginTop: 28, flexDirection: "row", gap: 10 },
  modalStat: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.6)",
    backgroundColor: "#f4f3ee",
    alignItems: "center",
    paddingVertical: 12,
  },
  modalStatLabel: {
    fontSize: 9,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "Inter_700Bold",
  },
  modalStatValue: {
    marginTop: 4,
    fontSize: 16,
    color: "#111",
    fontFamily: "Sora_800ExtraBold",
  },
  modalStatValueMuted: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalSecondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f3ee",
    flexDirection: "row",
    gap: 8,
  },
  modalSecondaryBtnText: {
    color: "#111",
    fontFamily: "Sora_700Bold",
    fontSize: 15,
  },
  modalPrimaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  modalPrimaryBtnText: {
    color: "#fff",
    fontFamily: "Sora_700Bold",
    fontSize: 15,
  },
});
