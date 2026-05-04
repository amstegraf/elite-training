import React from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { DrillBall } from "../../../domain/drills";
import { colors } from "../../../core/theme/theme";

interface PoolTableProps {
  balls: DrillBall[];
  width: number;
  height: number;
  origin: "bottom_left" | "top_left";
  showGrid?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
}

const ballColor: Record<number, string> = {
  1: "hsl(48, 95%, 55%)",
  2: "hsl(218, 75%, 42%)",
  3: "hsl(0, 75%, 48%)",
  4: "hsl(280, 45%, 38%)",
  5: "hsl(22, 85%, 50%)",
  6: "hsl(150, 60%, 28%)",
  7: "hsl(0, 55%, 28%)",
  8: "hsl(220, 15%, 10%)",
  9: "hsl(48, 95%, 55%)",
  10: "hsl(218, 75%, 42%)",
};

function toPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

export function DrillPoolTable({
  balls,
  width,
  height,
  origin,
  showGrid = true,
  onLayout,
}: PoolTableProps) {
  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <View style={styles.rail}>
        <View style={styles.felt}>
          {showGrid && (
            <>
              {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((x) => (
                <View key={`vx-${x}`} style={[styles.gridV, { left: `${x}%` }]} />
              ))}
              {[25, 50, 75].map((y) => (
                <View key={`hy-${y}`} style={[styles.gridH, { top: `${y}%` }]} />
              ))}
            </>
          )}
          {balls.map((ball) => {
            const x = toPercent(ball.x, width);
            const yRaw = toPercent(ball.y, height);
            const y = origin === "bottom_left" ? 100 - yRaw : yRaw;
            const isCue = ball.type === "cue";
            const number = ball.number ?? 0;
            const isStripe = number > 8;
            const bg = isCue ? "#ffffff" : (ballColor[number] ?? colors.primary);
            return (
              <View
                key={ball.id}
                style={[
                  styles.ball,
                  { left: `${x}%`, top: `${y}%`, backgroundColor: bg },
                  isCue && styles.cueBall,
                ]}
              >
                {isStripe && !isCue && <View style={styles.stripe} />}
                {!isCue && (
                  <View style={styles.numberCircle}>
                    <Text style={styles.numberText}>{number}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    aspectRatio: 2,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "hsl(26, 56%, 20%)",
    padding: 10,
  },
  rail: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  felt: {
    flex: 1,
    backgroundColor: "hsl(158, 55%, 18%)",
  },
  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(247, 245, 240, 0.1)",
  },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(247, 245, 240, 0.1)",
  },
  ball: {
    position: "absolute",
    width: 22,
    height: 22,
    marginLeft: -11,
    marginTop: -11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cueBall: {
    borderColor: "rgba(0,0,0,0.3)",
  },
  stripe: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "25%",
    bottom: "25%",
    backgroundColor: "#fff",
  },
  numberCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: 7,
    color: "hsl(220, 25%, 10%)",
    fontFamily: "Inter_700Bold",
  },
});
