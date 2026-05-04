import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ChevronRight, Hand, Play, Sparkles, Target, Trophy, XCircle } from "lucide-react-native";
import { colors } from "../../core/theme/theme";
import { markOnboardingCompleted } from "./storage";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../../data/AppStateContext";
import { GameTypeModal } from "../../ui/GameTypeModal";

type VisualKind = "welcome" | "miss" | "how" | "cta";

type Step = {
  kicker: string;
  title: string;
  body: string;
  visual: VisualKind;
};

const steps: Step[] = [
  {
    kicker: "Welcome",
    title: "Welcome to Cue Path",
    body: "Train like an elite player.",
    visual: "welcome",
  },
  {
    kicker: "The core rule",
    title: "You only log misses",
    body: "We analyze everything else.",
    visual: "miss",
  },
  {
    kicker: "How it works",
    title: "Three taps. That's it.",
    body: "",
    visual: "how",
  },
  {
    kicker: "Ready",
    title: "Play 10 racks",
    body: "Unlock your first report and become a legend.",
    visual: "cta",
  },
];

export function OnboardingScreen() {
  const nav = useNavigation<any>();
  const { startSession, activeSessions } = useAppState();
  const [idx, setIdx] = useState(0);
  const [showGameTypeModal, setShowGameTypeModal] = useState(false);
  const isLast = idx === steps.length - 1;
  const step = steps[idx];

  const completeAndGoHome = async () => {
    await markOnboardingCompleted();
    nav.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  const progress = useMemo(() => steps.map((_, i) => i <= idx), [idx]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.ambientOne} />
      <View style={styles.ambientTwo} />

      <View style={styles.topBar}>
        <View style={styles.progressRow}>
          {progress.map((active, i) => (
            <View
              key={`step-${i}`}
              style={[
                styles.progressDot,
                active ? (i === idx ? styles.progressDotActive : styles.progressDotPast) : styles.progressDotFuture,
              ]}
            />
          ))}
        </View>
        {!isLast && (
          <Pressable onPress={completeAndGoHome} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.content}>
        <Visual kind={step.visual} />
        <Text style={styles.kicker}>{step.kicker}</Text>
        <Text style={styles.title}>{step.title}</Text>
        {!!step.body && <Text style={styles.body}>{step.body}</Text>}
      </View>

      <View style={styles.footer}>
        {isLast ? (
          <TouchableOpacity style={styles.finalBtn} activeOpacity={0.92} onPress={() => setShowGameTypeModal(true)}>
            <Play size={20} color={colors.foreground} fill={colors.foreground} />
            <Text style={styles.finalBtnText}>Start First Session</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.continueBtn} activeOpacity={0.92} onPress={() => setIdx((v) => Math.min(v + 1, steps.length - 1))}>
            <Text style={styles.continueBtnText}>Continue</Text>
            <ChevronRight size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <GameTypeModal
        visible={showGameTypeModal}
        onSelect={async (ballCount) => {
          setShowGameTypeModal(false);
          await markOnboardingCompleted();
          const existing = activeSessions[0];
          if (existing) {
            nav.reset({ index: 1, routes: [{ name: "Home" }, { name: "Session", params: { sessionId: existing.id } }] });
            return;
          }
          const sessionId = startSession(ballCount);
          if (sessionId) {
            nav.reset({ index: 1, routes: [{ name: "Home" }, { name: "Session", params: { sessionId } }] });
            return;
          }
          nav.reset({ index: 0, routes: [{ name: "Home" }] });
        }}
        onCancel={() => setShowGameTypeModal(false)}
      />
    </SafeAreaView>
  );
}

function Visual({ kind }: { kind: VisualKind }) {
  if (kind === "welcome") {
    return (
      <View style={styles.welcomeWrap}>
        <View style={styles.welcomeRingOuter} />
        <View style={styles.welcomeRingInner} />
        <View style={styles.welcomeIconCard}>
          <Image source={require("../../../assets/cue-path-app-icon.png")} style={styles.welcomeIconImage} resizeMode="cover" />
        </View>
      </View>
    );
  }

  if (kind === "miss") {
    return (
      <View style={styles.missWrap}>
        <View style={styles.missBall}>
          <View style={styles.missBallInner}>
            <Text style={styles.missBallText}>9</Text>
          </View>
        </View>
        <View style={styles.missBadge}>
          <XCircle size={30} color="#fff" />
        </View>
      </View>
    );
  }

  if (kind === "how") {
    const items = [
      { icon: Hand, label: "Tap ball" },
      { icon: XCircle, label: "Select miss" },
      { icon: ChevronRight, label: "Continue" },
    ];
    return (
      <View style={styles.howWrap}>
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <View key={item.label} style={styles.howRow}>
              <View style={styles.howIcon}>
                <Icon size={20} color={colors.primaryGlow} />
              </View>
              <Text style={styles.howLabel}>{item.label}</Text>
              <Text style={styles.howIdx}>0{i + 1}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.ctaWrap}>
      <View style={styles.ctaCard}>
        <Trophy size={52} color={colors.foreground} />
        <Sparkles size={18} color={colors.tierGold} style={styles.sparkOne} />
        <Sparkles size={14} color={colors.tierGold} style={styles.sparkTwo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
  },
  ambientOne: {
    position: "absolute",
    top: -90,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(32, 181, 118, 0.2)",
  },
  ambientTwo: {
    position: "absolute",
    bottom: -110,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255, 147, 67, 0.08)",
  },
  topBar: {
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
    width: 16,
  },
  progressDotActive: {
    width: 32,
    backgroundColor: colors.primaryGlow,
  },
  progressDotPast: {
    backgroundColor: "rgba(32, 181, 118, 0.6)",
  },
  progressDotFuture: {
    backgroundColor: "rgba(247,245,240,0.24)",
  },
  skipBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  skipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "rgba(247,245,240,0.7)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 24,
  },
  kicker: {
    marginTop: 34,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 3,
    color: colors.primaryGlow,
  },
  title: {
    marginTop: 10,
    fontSize: 38,
    lineHeight: 44,
    fontFamily: "Sora_800ExtraBold",
    color: colors.primaryForeground,
    textAlign: "center",
  },
  body: {
    marginTop: 10,
    maxWidth: 280,
    textAlign: "center",
    color: "rgba(247,245,240,0.75)",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    paddingBottom: 18,
    paddingTop: 12,
  },
  continueBtn: {
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primaryForeground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  continueBtnText: {
    color: colors.primary,
    fontSize: 22,
    fontFamily: "Sora_700Bold",
  },
  finalBtn: {
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  finalBtnText: {
    color: colors.foreground,
    fontSize: 21,
    fontFamily: "Sora_700Bold",
  },
  welcomeWrap: {
    width: 224,
    height: 224,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeRingOuter: {
    position: "absolute",
    inset: 0,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(32,181,118,0.24)",
  },
  welcomeRingInner: {
    position: "absolute",
    top: 24,
    right: 24,
    bottom: 24,
    left: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(32,181,118,0.2)",
  },
  welcomeIconCard: {
    width: 114,
    height: 114,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(247,245,240,0.18)",
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  welcomeIconImage: {
    width: "100%",
    height: "100%",
  },
  missWrap: {
    width: 224,
    height: 224,
    alignItems: "center",
    justifyContent: "center",
  },
  missBall: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: "hsl(48, 95%, 55%)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  missBallInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  missBallText: {
    fontFamily: "Sora_700Bold",
    fontSize: 24,
    color: "hsl(220,25%,10%)",
  },
  missBadge: {
    position: "absolute",
    right: 28,
    bottom: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  howWrap: {
    width: "100%",
    maxWidth: 360,
    gap: 10,
  },
  howRow: {
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(247,245,240,0.15)",
    backgroundColor: "rgba(247,245,240,0.06)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 14,
  },
  howIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(32,181,118,0.16)",
  },
  howLabel: {
    flex: 1,
    color: colors.primaryForeground,
    fontSize: 24,
    fontFamily: "Sora_700Bold",
  },
  howIdx: {
    fontSize: 12,
    color: "rgba(247,245,240,0.45)",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
  },
  ctaWrap: {
    width: 224,
    height: 224,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaCard: {
    width: 132,
    height: 132,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkOne: {
    position: "absolute",
    top: -5,
    right: -5,
  },
  sparkTwo: {
    position: "absolute",
    bottom: -3,
    left: -5,
  },
});
