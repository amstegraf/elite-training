import React, { useCallback, useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../core/theme/theme";
import { GAME_BALL_COUNTS, GameBallCount } from "../domain/types";
import { PoolBall } from "./PoolBall";

interface GameTypeModalProps {
  visible: boolean;
  onSelect: (ballCount: GameBallCount) => void;
  onCancel: () => void;
}

export function GameTypeModal({ visible, onSelect, onCancel }: GameTypeModalProps) {
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsSelecting(false);
    }
  }, [visible]);

  const handleSelect = useCallback(
    (ballCount: GameBallCount) => {
      if (isSelecting) return;
      setIsSelecting(true);
      onSelect(ballCount);
    },
    [isSelecting, onSelect]
  );

  const handleCancel = useCallback(() => {
    if (isSelecting) return;
    onCancel();
  }, [isSelecting, onCancel]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Choose Game</Text>
          <Text style={styles.subtitle}>Select rack type before starting session</Text>
          <View style={styles.row}>
            {GAME_BALL_COUNTS.map((count) => (
              <TouchableOpacity
                key={count}
                style={[styles.option, isSelecting && styles.optionDisabled]}
                activeOpacity={0.9}
                disabled={isSelecting}
                onPress={() => handleSelect(count)}
              >
                <PoolBall number={count} size="sm" />
                <Text style={styles.optionLabel}>{count}-Ball</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.cancel, isSelecting && styles.optionDisabled]}
            onPress={handleCancel}
            activeOpacity={0.85}
            disabled={isSelecting}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.75)",
  },
  title: {
    fontSize: 20,
    color: colors.foreground,
    fontFamily: "Sora_700Bold",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
  row: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  option: {
    flex: 1,
    height: 88,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.mutedForeground,
  },
  cancel: {
    marginTop: 12,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
  },
  cancelText: {
    color: colors.foreground,
    fontFamily: "Inter_600SemiBold",
  },
});
