import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../core/theme/theme";

export function SplashScreen() {
  return (
    <View style={styles.wrap}>
      <View style={styles.dot} />
      <Text style={styles.logo}>Cue Path</Text>
      <Text style={styles.tag}>Precision pool training</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    gap: 10,
  },
  dot: {
    width: 68,
    height: 68,
    borderRadius: 999,
    backgroundColor: "#1d4ed8",
    borderWidth: 3,
    borderColor: "#38bdf8",
  },
  logo: { color: colors.text, fontWeight: "900", fontSize: 38, letterSpacing: 0.3 },
  tag: { color: colors.muted, fontWeight: "600", fontSize: 14, marginTop: 8 },
});
