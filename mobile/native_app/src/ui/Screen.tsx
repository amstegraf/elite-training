import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../core/theme/theme";

export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}) {
  if (!scroll) {
    return <SafeAreaView style={[styles.base, contentStyle]}>{children}</SafeAreaView>;
  }
  return (
    <SafeAreaView style={styles.base}>
      <ScrollView contentContainerStyle={[styles.scrollContent, contentStyle]}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 16, gap: 12 },
});
