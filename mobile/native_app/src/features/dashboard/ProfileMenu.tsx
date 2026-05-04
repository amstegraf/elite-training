import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  BarChart3,
  Bell,
  Bookmark,
  HelpCircle,
  Info,
  Medal,
  Settings as SettingsIcon,
  Sparkles,
  Target,
  Trophy,
  User,
} from "lucide-react-native";
import { colors } from "../../core/theme/theme";

type MenuRoute = "Profiles" | "Subscription" | "StatsTab" | "HistoryTab" | "Settings" | "Drills";

type MenuItem = {
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  route?: MenuRoute;
};

const groups: MenuItem[][] = [
  [
    { label: "Profile", icon: User, route: "Profiles" },
    { label: "Subscription", icon: Sparkles, route: "Subscription" },
  ],
  [
    { label: "My Stats", icon: BarChart3, route: "StatsTab" },
    { label: "Achievements", icon: Trophy },
    { label: "Rankings", icon: Medal },
  ],
  [
    { label: "My Drills", icon: Target, route: "Drills" },
    { label: "Saved Sessions", icon: Bookmark, route: "HistoryTab" },
  ],
  [
    { label: "Settings", icon: SettingsIcon, route: "Settings" },
    { label: "Notifications", icon: Bell },
    { label: "Help & Feedback", icon: HelpCircle },
    { label: "About", icon: Info },
  ],
];

interface ProfileMenuProps {
  name?: string;
}

const MENU_WIDTH = 248;

export function ProfileMenu({ name = "Player 1" }: ProfileMenuProps) {
  const nav = useNavigation<any>();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 20, y: 64, width: 44, height: 44 });
  const triggerRef = useRef<View | null>(null);

  const initials = useMemo(() => {
    const parts = name
      .split(" ")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return "P";
    return parts
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }, [name]);

  const handleItemPress = (item: MenuItem) => {
    setOpen(false);
    if (item.route) {
      nav.navigate(item.route);
      return;
    }
    Alert.alert("Coming soon", `${item.label} page is not available yet.`);
  };

  const handleOpenProfile = () => {
    setOpen(false);
    nav.navigate("Profiles");
  };

  const openMenu = () => {
    triggerRef.current?.measure((_, __, width, height, pageX, pageY) => {
      setAnchor({ x: pageX, y: pageY, width, height });
      setOpen(true);
    });
  };

  const { width: screenWidth } = Dimensions.get("window");
  const menuLeft = Math.max(12, Math.min(anchor.x, screenWidth - MENU_WIDTH - 12));

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity
          style={[styles.avatarButton, open && styles.avatarButtonOpen]}
          activeOpacity={0.88}
          onPress={openMenu}
        >
          <View style={styles.avatarInner}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        statusBarTranslucent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.menuCard,
              {
                top: anchor.y + anchor.height + 8,
                left: menuLeft,
              },
            ]}
            onPress={() => undefined}
          >
            <TouchableOpacity style={styles.profileHeader} activeOpacity={0.85} onPress={handleOpenProfile}>
              <Text style={styles.profileName}>{name}</Text>
              <Text style={styles.profileHint}>View profile</Text>
            </TouchableOpacity>

            {groups.map((group, groupIdx) => (
              <View key={`group-${groupIdx}`}>
                {groupIdx > 0 && <View style={styles.separator} />}
                {group.map((item) => {
                  const Icon = item.icon;
                  const implemented = Boolean(item.route);
                  return (
                    <TouchableOpacity
                      key={item.label}
                      style={styles.menuItem}
                      activeOpacity={0.82}
                      onPress={() => handleItemPress(item)}
                    >
                      <Icon size={16} color={colors.mutedForeground} />
                      <Text style={styles.menuItemLabel}>{item.label}</Text>
                      {!implemented && <Text style={styles.soonPill}>Soon</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(26, 117, 80, 0.35)",
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarButtonOpen: {
    borderColor: colors.primary,
    backgroundColor: "rgba(26, 117, 80, 0.14)",
    shadowColor: colors.primaryGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  menuCard: {
    position: "absolute",
    width: 248,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: "#13151A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 22,
    elevation: 9,
  },
  profileHeader: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  profileName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: colors.foreground,
  },
  profileHint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.mutedForeground,
    marginTop: 1,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  menuItem: {
    minHeight: 38,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.foreground,
  },
  soonPill: {
    fontSize: 10,
    color: colors.mutedForeground,
    backgroundColor: colors.secondary,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
    fontFamily: "Inter_600SemiBold",
  },
});
