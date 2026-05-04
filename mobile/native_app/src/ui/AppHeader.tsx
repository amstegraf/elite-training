import React, { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft, MoreHorizontal } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../core/theme/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  left?: ReactNode;
  right?: ReactNode;
}

export const AppHeader = ({ title, subtitle, back, left, right }: AppHeaderProps) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: Math.max(8, insets.top + 4) }]}>
      <View style={styles.leftContainer}>
        {back && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
            activeOpacity={0.8}
          >
            <ChevronLeft size={22} color={colors.foreground} />
          </TouchableOpacity>
        )}
        {left}
        <View style={styles.titleContainer}>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
      </View>
      <View style={styles.rightContainer}>
        {right ?? (
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
            <MoreHorizontal size={20} color={colors.foreground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  titleContainer: {
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.8,
    color: colors.mutedForeground,
  },
  title: {
    fontSize: 24,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    height: 40,
    width: 40,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
});
