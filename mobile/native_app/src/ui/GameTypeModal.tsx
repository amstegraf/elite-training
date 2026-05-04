import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../core/theme/theme";
import { GAME_BALL_COUNTS, GameBallCount } from "../domain/types";
import { PoolBall } from "./PoolBall";

interface GameTypeModalProps {
  visible: boolean;
  onSelect: (ballCount: GameBallCount) => boolean | Promise<boolean>;
  onCancel: () => void;
  disabled?: boolean;
  disabledLabel?: string;
}

export function GameTypeModal({
  visible,
  onSelect,
  onCancel,
  disabled = false,
  disabledLabel = "Preparing session...",
}: GameTypeModalProps) {
  const lockRef = useRef(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedBall, setSelectedBall] = useState<GameBallCount | null>(null);
  const blocked = isSelecting || disabled;

  useEffect(() => {
    if (!visible) {
      lockRef.current = false;
      setIsSelecting(false);
      setSelectedBall(null);
    }
  }, [visible]);

  const handleSelect = useCallback(
    async (ballCount: GameBallCount) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setIsSelecting(true);
      setSelectedBall(ballCount);
      const success = await onSelect(ballCount);
      if (!success) {
        lockRef.current = false;
        setIsSelecting(false);
        setSelectedBall(null);
      }
    },
    [onSelect]
  );

  const handleCancel = useCallback(() => {
    if (blocked) return;
    onCancel();
  }, [blocked, onCancel]);

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
                style={[
                  styles.option,
                  selectedBall === count && styles.optionSelected,
                  blocked && selectedBall !== count && styles.optionDisabled,
                ]}
                activeOpacity={0.9}
                disabled={blocked}
                onPress={() => handleSelect(count)}
              >
                <PoolBall number={count} size="sm" />
                <Text style={styles.optionLabel}>
                  {isSelecting && selectedBall === count ? "Starting..." : `${count}-Ball`}
                </Text>
                {isSelecting && selectedBall === count ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
          {disabled && !isSelecting ? (
            <View style={styles.disabledHintWrap}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text style={styles.disabledHintText}>{disabledLabel}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.cancel, blocked && styles.optionDisabled]}
            onPress={handleCancel}
            activeOpacity={0.85}
            disabled={blocked}
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
  optionSelected: {
    backgroundColor: "rgba(26,117,80,0.08)",
    borderWidth: 1,
    borderColor: "rgba(26,117,80,0.35)",
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
  disabledHintWrap: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  disabledHintText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: "Inter_500Medium",
  },
});
