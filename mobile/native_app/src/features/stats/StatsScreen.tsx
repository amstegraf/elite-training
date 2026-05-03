import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { AppHeader } from "../../ui/AppHeader";
import { colors } from "../../core/theme/theme";
import { Target, MapPin, Trophy, TrendingUp } from "lucide-react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path, Circle, Line } from "react-native-svg";
import { useAppState } from "../../data/AppStateContext";
import { progressionSeries } from "../../domain/metrics";
import { computeTier } from "../../domain/tier";

const ranges = ["1W", "1M", "3M", "6M", "1Y"] as const;

const c = {
  pot: colors.primary,
  pos: colors.accent,
  rack: colors.warning,
  pts: colors.primaryGlow,
};

const buildPath = (data: number[], w: number, h: number, pad = 6) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (data.length - 1);
  return data.map((d, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((d - min) / range) * (h - pad * 2);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
};

export function StatsScreen() {
  const [range, setRange] = useState<typeof ranges[number]>("3M");
  const { completedSessions, data } = useAppState();
  const daysByRange: Record<typeof ranges[number], number> = {
    "1W": 7,
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
  };
  const pointsSeries = progressionSeries(completedSessions, daysByRange[range], (g) => {
    const tier = computeTier(g.potRate, g.positionRate, g.rackConversionRate, data.settings.tier);
    return tier?.points ?? 0;
  });
  const series = {
    pot: pointsSeries.map((p) => p.pot ?? 0),
    pos: pointsSeries.map((p) => p.pos ?? 0),
    rack: pointsSeries.map((p) => p.rack ?? 0),
    pts: pointsSeries.map((p) => p.pts),
  };
  
  const windowWidth = Dimensions.get("window").width;
  const chartWidth = windowWidth - 40 - 32; // padding horizontal 20 + padding inside card 16
  const chartHeight = 90;

  const cards = [
    {
      key: "pot",
      label: "Pot Success",
      value: Math.round(series.pot[series.pot.length - 1] ?? 0),
      delta: Math.round((series.pot[series.pot.length - 1] ?? 0) - (series.pot[0] ?? 0)),
      icon: Target,
      color: c.pot,
      data: series.pot.length > 1 ? series.pot : [0, 0],
      unit: "%",
    },
    {
      key: "pos",
      label: "Position Outcome",
      value: Math.round(series.pos[series.pos.length - 1] ?? 0),
      delta: Math.round((series.pos[series.pos.length - 1] ?? 0) - (series.pos[0] ?? 0)),
      icon: MapPin,
      color: c.pos,
      data: series.pos.length > 1 ? series.pos : [0, 0],
      unit: "%",
    },
    {
      key: "rack",
      label: "Rack Conversion",
      value: Math.round(series.rack[series.rack.length - 1] ?? 0),
      delta: Math.round((series.rack[series.rack.length - 1] ?? 0) - (series.rack[0] ?? 0)),
      icon: Trophy,
      color: c.rack,
      data: series.rack.length > 1 ? series.rack : [0, 0],
      unit: "%",
    },
    {
      key: "pts",
      label: "Tier Points",
      value: Math.round(series.pts[series.pts.length - 1] ?? 0),
      delta: Math.round((series.pts[series.pts.length - 1] ?? 0) - (series.pts[0] ?? 0)),
      icon: TrendingUp,
      color: c.pts,
      data: series.pts.length > 1 ? series.pts : [0, 0],
      unit: "pts",
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="Progression" subtitle="Stats" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Range selector */}
        <View style={styles.rangeSelector}>
          {ranges.map((r) => {
            const active = range === r;
            return (
              <TouchableOpacity
                key={r}
                activeOpacity={0.8}
                onPress={() => setRange(r)}
                style={[styles.rangeButton, active && styles.rangeButtonActive]}
              >
                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.cardsContainer}>
          {cards.map((card) => {
            const max = Math.max(...card.data);
            const min = Math.min(...card.data);
            const last = card.data[card.data.length - 1];
            const xDot = chartWidth - 6;
            const yDot = chartHeight - 6 - ((last - min) / (max - min || 1)) * (chartHeight - 12);
            
            const areaPath = `${buildPath(card.data, chartWidth, chartHeight)} L${chartWidth - 6},${chartHeight - 6} L6,${chartHeight - 6} Z`;
            const linePath = buildPath(card.data, chartWidth, chartHeight);

            return (
              <View key={card.key} style={styles.statCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: `${card.color}20` }]}>
                      <card.icon size={16} color={card.color} strokeWidth={2.4} />
                    </View>
                    <View>
                      <Text style={styles.cardLabel}>{card.label}</Text>
                      <Text style={styles.cardValue}>
                        {card.value.toLocaleString()}
                        <Text style={styles.cardUnit}> {card.unit}</Text>
                      </Text>
                    </View>
                  </View>
                  <View style={styles.deltaBadge}>
                    <Text style={styles.deltaText}>▲ {card.delta}{card.unit === "%" ? "%" : ""}</Text>
                  </View>
                </View>

                {/* Sparkline */}
                <View style={styles.chartContainer}>
                  <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                    <Defs>
                      <SvgLinearGradient id={`grad-${card.key}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={card.color} stopOpacity="0.35" />
                        <Stop offset="1" stopColor={card.color} stopOpacity="0" />
                      </SvgLinearGradient>
                    </Defs>
                    
                    {/* Baseline grid */}
                    {[0.25, 0.5, 0.75].map((p, i) => (
                      <Line key={i} x1="0" x2={chartWidth} y1={chartHeight * p} y2={chartHeight * p} stroke={colors.border} strokeWidth="1" strokeDasharray="2,4" />
                    ))}
                    
                    {/* Area */}
                    <Path d={areaPath} fill={`url(#grad-${card.key})`} />
                    
                    {/* Line */}
                    <Path d={linePath} fill="none" stroke={card.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Dot */}
                    <Circle cx={xDot} cy={yDot} r="4" fill={card.color} stroke={colors.card} strokeWidth="2" />
                  </Svg>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  rangeSelector: {
    flexDirection: "row",
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  rangeButtonActive: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  rangeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: colors.mutedForeground,
  },
  rangeTextActive: {
    color: colors.foreground,
  },
  cardsContainer: {
    gap: 12,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 224, 221, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    height: 36,
    width: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.mutedForeground,
  },
  cardValue: {
    fontSize: 24,
    fontFamily: "Sora_700Bold",
    color: colors.foreground,
    marginTop: 2,
  },
  cardUnit: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  deltaBadge: {
    backgroundColor: "rgba(32, 181, 118, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  deltaText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: colors.primary,
  },
  chartContainer: {
    marginTop: 12,
    height: 90,
  },
});
