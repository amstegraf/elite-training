import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../ui/AppHeader";
import { colors } from "../../core/theme/theme";
import { Check, Crown, Ellipsis, Heart, Sparkles, Zap } from "lucide-react-native";

type PlanId = "free" | "pro" | "elite" | "supporter";

type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  price: string;
  period?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  borderColor: string;
  tintBg: string;
  selectedBg: string;
  dotColor: string;
  features: string[];
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Start your training journey",
    price: "$0",
    period: "forever",
    icon: Sparkles,
    borderColor: "rgba(32, 181, 118, 0.75)",
    tintBg: "rgba(32, 181, 118, 0.08)",
    selectedBg: "rgba(32, 181, 118, 0.26)",
    dotColor: "#20b576",
    features: [
      "Unlimited sessions",
      "Unlimited Statistics",
      "Limited history (7-14 days)",
      "Drill path (level progression)",
      "Drill library + tracking",
      "Global ranking (after 50 sessions)",
      "Continental ranking",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Train smarter with AI & analytics",
    price: "$9.99",
    period: "/month",
    icon: Zap,
    borderColor: "rgba(245, 166, 10, 0.7)",
    tintBg: "rgba(245, 166, 10, 0.12)",
    selectedBg: "rgba(245, 166, 10, 0.28)",
    dotColor: "#f5a60a",
    features: [
      "AI Pattern Play",
      "AI Coach (session + stats)",
      "Full history (cloud sync)",
      "Add your drills",
      "Share your drills",
      "Tournaments & matches",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "Maximum performance & control",
    price: "$19.99",
    period: "/month",
    icon: Crown,
    borderColor: "rgba(255, 75, 75, 0.65)",
    tintBg: "rgba(255, 75, 75, 0.1)",
    selectedBg: "rgba(255, 75, 75, 0.24)",
    dotColor: colors.danger,
    features: [
      "Everything in Pro",
      "Image to Drill (AI table mapping)",
      "Drill generator (AI-powered)",
      "Multiple profiles (coaches)",
      "Match mode (advanced)",
      "Pressure training modes",
    ],
  },
  {
    id: "supporter",
    name: "Supporter",
    tagline: "Back the project",
    price: "",
    icon: Heart,
    borderColor: "rgba(32, 181, 118, 0.55)",
    tintBg: "rgba(32, 181, 118, 0.1)",
    selectedBg: "rgba(32, 181, 118, 0.24)",
    dotColor: colors.primaryGlow,
    features: [
      "Lifetime Supporter badge on your profile",
      "Help shape the future of Cue Path",
      "Priority on bug reports and feature requests",
    ],
  },
];

export function SubscriptionScreen() {
  const nav = useNavigation<any>();
  const [currentPlan] = useState<PlanId>("free");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("free");
  const selected = PLANS.find((plan) => plan.id === selectedPlan) ?? PLANS[0];
  const isCurrent = selectedPlan === currentPlan;
  const current = PLANS.find((plan) => plan.id === currentPlan) ?? PLANS[0];

  return (
    <View style={styles.container}>
      <AppHeader
        title="Choose Your Plan"
        subtitle="Subscription"
        back
        right={
          <TouchableOpacity style={styles.menuButton} onPress={() => nav.goBack()}>
            <Ellipsis size={18} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.planStack}>
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const planIsCurrent = plan.id === currentPlan;
            const planSelected = plan.id === selectedPlan;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  { borderColor: plan.borderColor, backgroundColor: plan.tintBg },
                  planSelected && styles.planCardSelected,
                  planSelected && { backgroundColor: plan.selectedBg, borderColor: plan.dotColor },
                ]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.9}
              >
                <View style={styles.planHeader}>
                  <View style={styles.planIcon}>
                    <Icon size={20} color={colors.foreground} />
                  </View>
                  <View style={styles.planTitleWrap}>
                    <View style={styles.planTitleRow}>
                      <View style={[styles.planDot, { backgroundColor: plan.dotColor }]} />
                      <Text style={styles.planTitle}>{plan.name}</Text>
                      {planIsCurrent && (
                        <View style={styles.currentPill}>
                          <Text style={styles.currentPillText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.planTagline}>{plan.tagline}</Text>
                  </View>
                  {plan.id === "supporter" ? (
                    <View style={styles.supporterRightIcon}>
                      <Heart size={22} color={colors.primaryForeground} fill={colors.primaryForeground} />
                    </View>
                  ) : (
                    <View style={styles.planPriceWrap}>
                      <Text style={styles.planPrice}>{plan.price}</Text>
                      {plan.period ? <Text style={styles.planPeriod}>{plan.period}</Text> : null}
                    </View>
                  )}
                </View>

                <View style={styles.featureList}>
                  {plan.features.map((feature) => (
                    <View key={`${plan.id}-${feature}`} style={styles.featureRow}>
                      <View style={[styles.featureIcon, { backgroundColor: plan.dotColor }]}>
                        <Check size={11} color="#FFFFFF" />
                      </View>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.fixedFooterWrap}>
        {isCurrent ? (
          <View style={styles.currentCard}>
            <View style={styles.currentIcon}>
              <Sparkles size={16} color={colors.primary} />
            </View>
            <View style={styles.currentTextWrap}>
              <Text style={styles.currentEyebrow}>Current Plan</Text>
              <Text style={styles.currentPlan}>{current.name}</Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.upgradeButton} activeOpacity={0.9}>
            <Text style={styles.upgradeButtonText}>Upgrade to {selected.name}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  menuButton: {
    height: 40,
    width: 40,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 170 },
  currentCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 61,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.8)",
    padding: 12,
  },
  currentIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(32, 181, 118, 0.12)",
  },
  currentTextWrap: { flex: 1, marginLeft: 10 },
  currentEyebrow: {
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontFamily: "Inter_700Bold",
  },
  currentPlan: {
    fontSize: 20,
    lineHeight: 24,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
    marginTop: 1,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(32, 181, 118, 0.18)",
  },
  activeBadgeText: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "Inter_700Bold",
    color: colors.primary,
  },
  upgradeButton: {
    height: 61,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  upgradeButtonText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontFamily: "Sora_700Bold",
  },
  planStack: { gap: 12 },
  fixedFooterWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 20,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 14,
  },
  planCardSelected: {
    borderWidth: 2,
  },
  planHeader: { flexDirection: "row", alignItems: "flex-start" },
  planIcon: {
    height: 42,
    width: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  planTitleWrap: { flex: 1, marginLeft: 10 },
  planTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  planDot: { width: 8, height: 8, borderRadius: 4 },
  planTitle: { fontSize: 32, lineHeight: 36, color: colors.foreground, fontFamily: "Sora_700Bold" },
  currentPill: {
    borderRadius: 999,
    backgroundColor: "rgba(21, 30, 45, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentPillText: {
    fontSize: 10,
    color: colors.foreground,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: "Inter_700Bold",
  },
  planTagline: { marginTop: 2, fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
  planPriceWrap: { alignItems: "flex-end", marginLeft: 8 },
  planPrice: { fontSize: 36, lineHeight: 40, color: colors.foreground, fontFamily: "Sora_700Bold" },
  planPeriod: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
  supporterRightIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  featureList: { gap: 10, marginTop: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1, color: colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium" },
});
