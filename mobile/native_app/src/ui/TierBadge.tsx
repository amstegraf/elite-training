import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { colors } from "../core/theme/theme";

interface TierBadgeProps {
  tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Elite";
}

export const TierBadge = ({ tier }: TierBadgeProps) => {
  const getTierStyles = (): { view: ViewStyle; text: TextStyle } => {
    switch (tier) {
      case "Bronze": return { view: { backgroundColor: "rgba(196, 114, 48, 0.2)", borderColor: "rgba(196, 114, 48, 0.5)" }, text: { color: colors.tierBronze } };
      case "Silver": return { view: { backgroundColor: "rgba(150, 153, 163, 0.2)", borderColor: "rgba(150, 153, 163, 0.5)" }, text: { color: colors.tierSilver } };
      case "Gold": return { view: { backgroundColor: "rgba(242, 185, 22, 0.2)", borderColor: "rgba(242, 185, 22, 0.5)" }, text: { color: colors.tierGold } };
      case "Platinum": return { view: { backgroundColor: "rgba(150, 185, 204, 0.2)", borderColor: "rgba(150, 185, 204, 0.5)" }, text: { color: colors.tierPlatinum } };
      case "Elite": return { view: { backgroundColor: "rgba(32, 181, 118, 0.2)", borderColor: "rgba(32, 181, 118, 0.5)" }, text: { color: colors.tierElite } };
      default: return { view: { backgroundColor: "rgba(150, 153, 163, 0.2)", borderColor: "rgba(150, 153, 163, 0.5)" }, text: { color: colors.tierSilver } };
    }
  };

  const tierStyles = getTierStyles();

  return (
    <View style={[styles.badge, tierStyles.view]}>
      <Text style={[styles.text, tierStyles.text]}>{tier}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
