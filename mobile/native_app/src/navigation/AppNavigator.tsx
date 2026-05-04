import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Home, Activity, History, Calendar, BarChart3, User, Settings } from "lucide-react-native";
import { colors } from "../core/theme/theme";
import { DashboardScreen } from "../features/dashboard/DashboardScreen";
import { SessionScreen } from "../features/session/SessionScreen";
import { SessionReportScreen } from "../features/report/SessionReportScreen";
import { SessionHistoryScreen } from "../features/history/SessionHistoryScreen";
import { CalendarScreen } from "../features/calendar/CalendarScreen";
import { ProfilesScreen } from "../features/profiles/ProfilesScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { StatsScreen } from "../features/stats/StatsScreen";
import { SubscriptionScreen } from "../features/subscription/SubscriptionScreen";
import { OnboardingScreen } from "../features/onboarding/OnboardingScreen";
import { DrillsScreen } from "../features/drills/DrillsScreen";
import { DrillDetailScreen } from "../features/drills/DrillDetailScreen";
import { DrillsPathScreen } from "../features/drills/DrillsPathScreen";
import { AboutScreen } from "../features/about/AboutScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined ? options.tabBarLabel : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const IconComponent = options.tabBarIcon;

          return (
            <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.8} style={styles.tabItem}>
              <View style={[styles.iconContainer, isFocused && styles.iconContainerFocused]}>
                {IconComponent && <IconComponent size={20} color={isFocused ? colors.primary : colors.mutedForeground} strokeWidth={isFocused ? 2.4 : 2} />}
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function RootTabs() {
  return (
    <Tabs.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="DashboardTab" component={DashboardScreen} options={{ tabBarLabel: "Home", tabBarIcon: Home }} />
      <Tabs.Screen name="SessionTab" component={SessionScreen} options={{ tabBarLabel: "Session", tabBarIcon: Activity }} />
      <Tabs.Screen name="StatsTab" component={StatsScreen} options={{ tabBarLabel: "Stats", tabBarIcon: BarChart3 }} />
      <Tabs.Screen name="CalendarTab" component={CalendarScreen} options={{ tabBarLabel: "Calendar", tabBarIcon: Calendar }} />
      <Tabs.Screen name="HistoryTab" component={SessionHistoryScreen} options={{ tabBarLabel: "History", tabBarIcon: History }} />
    </Tabs.Navigator>
  );
}

interface AppNavigatorProps {
  initialRouteName?: "Onboarding" | "Home";
}

export function AppNavigator({ initialRouteName = "Home" }: AppNavigatorProps) {
  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.card,
          text: colors.foreground,
          border: colors.border,
          primary: colors.primary,
        },
      }}
    >
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={RootTabs} />
        <Stack.Screen name="Session" component={SessionScreen} />
        <Stack.Screen name="Report" component={SessionReportScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="Profiles" component={ProfilesScreen} />
        <Stack.Screen name="Drills" component={DrillsScreen} />
        <Stack.Screen name="DrillsPath" component={DrillsPathScreen} />
        <Stack.Screen name="DrillDetail" component={DrillDetailScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  tabBarInner: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.8)",
    shadowColor: "#13151A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    height: 36,
    width: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconContainerFocused: {
    backgroundColor: "rgba(26, 117, 80, 0.1)",
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.mutedForeground,
  },
  tabLabelFocused: {
    color: colors.primary,
  },
});
