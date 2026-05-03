import React from "react";
import { TouchableOpacity, Text, View, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { colors } from "../core/theme/theme";

interface PoolBallProps {
  number: number;
  size?: "sm" | "md" | "lg";
  active?: boolean;
  onPress?: () => void;
}

const ballColors: Record<number, { bg: string; text: string }> = {
  1: { bg: "hsl(48, 95%, 55%)", text: "hsl(220, 25%, 10%)" },
  2: { bg: "hsl(218, 75%, 42%)", text: "#fff" },
  3: { bg: "hsl(0, 75%, 48%)", text: "#fff" },
  4: { bg: "hsl(280, 45%, 38%)", text: "#fff" },
  5: { bg: "hsl(22, 85%, 50%)", text: "#fff" },
  6: { bg: "hsl(150, 60%, 28%)", text: "#fff" },
  7: { bg: "hsl(0, 55%, 28%)", text: "#fff" },
  8: { bg: "hsl(220, 15%, 10%)", text: "#fff" },
  9: { bg: "hsl(48, 95%, 55%)", text: "hsl(220, 25%, 10%)" }, // Stripe
};

export const PoolBall = ({ number, size = "md", active, onPress }: PoolBallProps) => {
  const isStripe = number > 8;
  const colorDef = ballColors[number] || ballColors[1];
  
  const sizeMap = {
    sm: 36,
    md: 48,
    lg: 64,
  };
  
  const dim = sizeMap[size];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.ball,
        { width: dim, height: dim, backgroundColor: colorDef.bg },
        active && styles.activeOuter
      ]}
    >
      {isStripe && (
        <View style={styles.stripeBg} />
      )}
      <View style={[styles.innerCircle, { width: dim * 0.5, height: dim * 0.5 }]}>
        <Text style={[styles.number, { fontSize: dim * 0.28 }]}>{number}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  ball: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    // inner shadow emulation via border + shadow
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  activeOuter: {
    borderWidth: 3,
    borderColor: colors.primary,
    transform: [{ scale: 1.1 }],
  },
  stripeBg: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "25%",
    bottom: "25%",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  innerCircle: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.5)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  number: {
    color: "hsl(220, 25%, 10%)",
    fontFamily: "Sora_800ExtraBold",
  },
});
