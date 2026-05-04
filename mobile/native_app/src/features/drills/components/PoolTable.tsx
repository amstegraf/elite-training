import React from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { DrillBall } from "../../../domain/drills";
import { colors } from "../../../core/theme/theme";
import Svg, { Line, Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";

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
  const RAIL = 6;
  const playW = 100 - RAIL * 2;
  const playH = 100 - RAIL * 2;

  const ballPctW = 4.5 * (playW / 100);
  const ballPctH = ballPctW * 2;

  const longDiamonds = [12.5, 25, 37.5, 62.5, 75, 87.5];
  const shortDiamonds = [25, 50, 75];

  const pct = (value: number): `${number}%` => `${value}%`;

  const pocketCoords: Record<string, { x: number; y: number }> = {
    top_left: { x: 0, y: 0 },
    top_middle: { x: 50, y: 0 },
    top_right: { x: 100, y: 0 },
    bottom_left: { x: 0, y: 100 },
    bottom_middle: { x: 50, y: 100 },
    bottom_right: { x: 100, y: 100 },
  };

  const guideLines = balls
    .filter((ball) => ball.type === "object" && ball.targetPocket)
    .map((ball) => {
      const x = toPercent(ball.x, width);
      const yRaw = toPercent(ball.y, height);
      const y = origin === "bottom_left" ? 100 - yRaw : yRaw;
      const target = pocketCoords[ball.targetPocket ?? ""];
      if (!target) return null;
      return {
        id: ball.id,
        x1: x,
        y1: y,
        x2: target.x,
        y2: target.y,
        color: ballColor[ball.number ?? 1] ?? colors.primary,
      };
    })
    .filter((line): line is NonNullable<typeof line> => Boolean(line));

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <LinearGradient
        colors={["hsl(28, 55%, 28%)", "hsl(20, 50%, 18%)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.railOuter}
      >
        <View style={styles.railInnerBorder} />

        <View style={[styles.felt, { left: pct(RAIL), top: pct(RAIL), right: pct(RAIL), bottom: pct(RAIL) }]}>
          <Svg pointerEvents="none" style={styles.guideLayer} viewBox="0 0 100 100" preserveAspectRatio="none">
            {showGrid && (
              <>
                {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((x) => (
                  <Line key={`vx-${x}`} x1={x} y1={0} x2={x} y2={100} stroke="rgba(247, 245, 240, 0.08)" strokeWidth={0.2} />
                ))}
                {[25, 50, 75].map((y) => (
                  <Line key={`hy-${y}`} x1={0} y1={y} x2={100} y2={y} stroke="rgba(247, 245, 240, 0.08)" strokeWidth={0.2} />
                ))}
                <Line x1={25} y1={0} x2={25} y2={100} stroke="rgba(247, 245, 240, 0.18)" strokeWidth={0.2} strokeDasharray="1 1" />
                <Circle cx={75} cy={50} r={0.8} fill="rgba(247, 245, 240, 0.45)" />
                <Circle cx={25} cy={50} r={0.6} fill="rgba(247, 245, 240, 0.3)" />
              </>
            )}
            {guideLines.map((line) => (
              <Line
                key={`guide-${line.id}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.color}
                strokeWidth={0.7}
                strokeOpacity={0.8}
                strokeDasharray="1.2 1.2"
              />
            ))}
          </Svg>

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
                  {
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${ballPctW}%`,
                    height: `${ballPctH}%`,
                    backgroundColor: bg,
                  },
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

        {[
          [RAIL, RAIL],
          [50, RAIL * 0.9],
          [100 - RAIL, RAIL],
          [RAIL, 100 - RAIL],
          [50, 100 - RAIL * 0.9],
          [100 - RAIL, 100 - RAIL],
        ].map(([cx, cy], i) => {
          const isSide = i === 1 || i === 4;
          return (
            <View
              key={`pocket-${i}`}
              style={[
                styles.pocket,
                {
                  left: pct(cx),
                  top: pct(cy),
                  width: isSide ? "6%" : "7%",
                },
              ]}
            />
          );
        })}

        {longDiamonds.map((p) => (
          <View key={`dt-${p}`} style={[styles.diamond, { left: pct(RAIL + (p / 100) * playW), top: pct(RAIL / 2) }]} />
        ))}
        {longDiamonds.map((p) => (
          <View key={`db-${p}`} style={[styles.diamond, { left: pct(RAIL + (p / 100) * playW), top: pct(100 - RAIL / 2) }]} />
        ))}
        {shortDiamonds.map((p) => (
          <View key={`dl-${p}`} style={[styles.diamond, { top: pct(RAIL + (p / 100) * playH), left: pct(RAIL / 2) }]} />
        ))}
        {shortDiamonds.map((p) => (
          <View key={`dr-${p}`} style={[styles.diamond, { top: pct(RAIL + (p / 100) * playH), left: pct(100 - RAIL / 2) }]} />
        ))}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    aspectRatio: 2,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  railOuter: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  railInnerBorder: {
    position: "absolute",
    inset: "2%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(138, 90, 68, 0.6)",
  },
  felt: {
    position: "absolute",
    backgroundColor: "hsl(158, 55%, 20%)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 15,
  },
  guideLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  pocket: {
    position: "absolute",
    aspectRatio: 1,
    backgroundColor: "#050505",
    borderRadius: 999,
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
    borderWidth: 2,
    borderColor: "hsl(28, 30%, 18%)",
  },
  diamond: {
    position: "absolute",
    width: "1.4%",
    aspectRatio: 1,
    backgroundColor: "hsl(40, 35%, 88%)",
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }, { rotate: "45deg" }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 1,
  },
  ball: {
    position: "absolute",
    borderRadius: 999,
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 3,
    elevation: 3,
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
    width: "55%",
    height: "55%",
    borderRadius: 999,
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
