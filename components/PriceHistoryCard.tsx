import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { useTheme } from "@/context/ThemeContext";
import {
  PRICE_RANGES,
  buildSeries,
  priceVerdict,
  usePriceHistory,
  type PriceSeries,
} from "@/lib/priceHistory";

const CHART_HEIGHT = 170;
const PAD = { top: 12, right: 12, bottom: 22, left: 52 };

const money = (n: number) => `$${n.toFixed(2)}`;
const shortDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const longDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** 3–5 "nice" tick values covering [min, max]. */
function niceTicks(min: number, max: number) {
  if (max - min < 1e-9) {
    const pad = Math.max(1, Math.abs(max) * 0.1);
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks, step };
}

/** Axis label precise enough that neighbouring ticks never read the same. */
const tickLabel = (v: number, step: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: step < 1 ? 2 : 0, maximumFractionDigits: step < 1 ? 2 : 0 })}`;

/** Price in force at time t (step function). */
function priceAt(series: PriceSeries, t: number) {
  let price = series.points[0].price;
  for (const p of series.points) if (p.at <= t) price = p.price;
  return price;
}

type Props = { productId?: string; currentPrice: number };

export default function PriceHistoryCard({ productId, currentPrice }: Props) {
  const { colors } = useTheme();
  const { points: history, loading, error } = usePriceHistory(productId);
  const [rangeKey, setRangeKey] = useState("6m");
  const [width, setWidth] = useState(0);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const range = PRICE_RANGES.find((r) => r.key === rangeKey)!;
  const rangeLabel = range.days == null ? "all time" : range.label;
  const series = useMemo(
    () => buildSeries(history, currentPrice, range.days),
    [history, currentPrice, range.days]
  );
  const verdict = series ? priceVerdict(series, rangeLabel) : null;

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;

  const geometry = useMemo(() => {
    if (!series || plotW <= 0) return null;
    const { lo, hi, ticks, step } = niceTicks(series.min, series.max);
    const span = Math.max(1, series.end - series.start);
    const x = (t: number) => PAD.left + ((t - series.start) / span) * plotW;
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH;
    // Step-after path: hold each price until the next change.
    let line = `M${x(series.points[0].at)},${y(series.points[0].price)}`;
    for (let i = 1; i < series.points.length; i++) {
      line += ` H${x(series.points[i].at)} V${y(series.points[i].price)}`;
    }
    const baseY = PAD.top + plotH;
    const area = `${line} V${baseY} H${x(series.points[0].at)} Z`;
    // Short spans: just start and "Today", so the same date isn't printed twice.
    const xTicks = span < 3 * 24 * 60 * 60 * 1000 ? [series.start, series.end] : [series.start, series.start + span / 2, series.end];
    return { x, y, ticks, step, line, area, xTicks, invertX: (px: number) => series.start + ((px - PAD.left) / plotW) * span };
  }, [series, plotW, plotH]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const track = (locationX: number) => {
    if (!geometry || !series) return;
    const clamped = Math.min(Math.max(locationX, PAD.left), PAD.left + plotW);
    setHoverT(geometry.invertX(clamped));
  };

  const header = (
    <View style={styles.headerRow}>
      <Text style={[styles.title, { color: colors.text }]}>Price History</Text>
      {series?.simulated && (
        <View style={[styles.demoBadge, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Text style={[styles.demoText, { color: colors.subtext }]}>Demo data · simulated</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {header}
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
      </View>
    );
  }

  if (error || !series) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {header}
        <Text style={[styles.note, { color: colors.subtext }]}>
          {error
            ? "Price history isn't available right now."
            : "No price history yet. Tracking starts when the product is added to the store."}
        </Text>
      </View>
    );
  }

  const tracking = series.points.length <= 2 && series.max - series.min < 0.01;
  const hoverPrice = hoverT != null ? priceAt(series, hoverT) : null;
  const hoverX = hoverT != null && geometry ? geometry.x(hoverT) : null;
  const tooltipLeft = hoverX != null ? Math.min(Math.max(hoverX - 60, 0), Math.max(0, width - 120)) : 0;

  const stats: { label: string; value: string }[] = [
    { label: "Current", value: money(series.current) },
    { label: "Lowest", value: money(series.min) },
    { label: "Highest", value: money(series.max) },
    { label: "Average", value: money(series.average) },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {header}

      {/* Range filter */}
      <View style={styles.rangeRow}>
        {PRICE_RANGES.map((r) => {
          const active = r.key === rangeKey;
          return (
            <TouchableOpacity
              key={r.key}
              onPress={() => {
                setRangeKey(r.key);
                setHoverT(null);
              }}
              style={[styles.rangeChip, { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.rangeText, { color: active ? "#fff" : colors.text }]}>{r.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stat tiles: the numbers are always visible, not only in the chart */}
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>{s.label}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
          </View>
        ))}
      </View>

      {verdict && (
        <Text
          style={[
            styles.verdict,
            { color: verdict.tone === "good" ? colors.success : verdict.tone === "high" ? colors.error : colors.subtext },
          ]}
        >
          {verdict.tone === "good" ? "✓ " : verdict.tone === "high" ? "▲ " : "• "}
          {verdict.text}
        </Text>
      )}

      {/* Chart */}
      <View
        onLayout={onLayout}
        style={{ height: CHART_HEIGHT }}
        accessible
        accessibilityLabel={`Price history, ${rangeLabel}: current ${money(series.current)}, lowest ${money(series.min)}, highest ${money(series.max)}.`}
        onStartShouldSetResponder={() => true}
        onResponderTerminationRequest={() => true}
        onResponderGrant={(e: GestureResponderEvent) => track(e.nativeEvent.locationX)}
        onResponderMove={(e: GestureResponderEvent) => track(e.nativeEvent.locationX)}
        onResponderRelease={() => setHoverT(null)}
        // Mouse hover on web
        {...({
          onPointerMove: (e: { nativeEvent: { offsetX?: number; locationX?: number } }) =>
            track(e.nativeEvent.offsetX ?? e.nativeEvent.locationX ?? 0),
          onPointerLeave: () => setHoverT(null),
        } as object)}
      >
        {geometry && (
          <Svg width={width} height={CHART_HEIGHT} pointerEvents="none">
            {geometry.ticks.map((t) => (
              <React.Fragment key={t}>
                <Line x1={PAD.left} x2={PAD.left + plotW} y1={geometry.y(t)} y2={geometry.y(t)} stroke={colors.border} strokeWidth={1} />
                <SvgText x={PAD.left - 6} y={geometry.y(t) + 3} fontSize={10} fill={colors.subtext} textAnchor="end">
                  {tickLabel(t, geometry.step)}
                </SvgText>
              </React.Fragment>
            ))}
            {geometry.xTicks.map((t, i) => (
              <SvgText
                key={i}
                x={geometry.x(t)}
                y={CHART_HEIGHT - 6}
                fontSize={10}
                fill={colors.subtext}
                textAnchor={i === 0 ? "start" : i === geometry.xTicks.length - 1 ? "end" : "middle"}
              >
                {i === geometry.xTicks.length - 1 ? "Today" : shortDate(t)}
              </SvgText>
            ))}
            <Path d={geometry.area} fill={colors.primary} opacity={0.1} />
            <Path d={geometry.line} stroke={colors.primary} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {/* Current price end-dot with a surface ring */}
            <Circle
              cx={geometry.x(series.end)}
              cy={geometry.y(series.current)}
              r={4}
              fill={colors.primary}
              stroke={colors.card}
              strokeWidth={2}
            />
            {hoverX != null && hoverPrice != null && (
              <>
                <Line x1={hoverX} x2={hoverX} y1={PAD.top} y2={PAD.top + plotH} stroke={colors.subtext} strokeWidth={1} />
                <Circle cx={hoverX} cy={geometry.y(hoverPrice)} r={4} fill={colors.primary} stroke={colors.card} strokeWidth={2} />
              </>
            )}
          </Svg>
        )}
        {hoverT != null && hoverPrice != null && (
          <View
            pointerEvents="none"
            style={[styles.tooltip, { left: tooltipLeft, backgroundColor: colors.text }]}
          >
            <Text style={[styles.tooltipDate, { color: colors.background }]}>{longDate(hoverT)}</Text>
            <Text style={[styles.tooltipPrice, { color: colors.background }]}>{money(hoverPrice)}</Text>
          </View>
        )}
      </View>

      {tracking && (
        <Text style={[styles.note, { color: colors.subtext }]}>
          No price changes yet. Tracking started on {longDate(series.start)}
          {series.coveredDays === 0 ? " (today)" : series.coveredDays === 1 ? " (1 day ago)" : ` (${series.coveredDays} days ago)`}, and
          this chart fills in as the price changes.
        </Text>
      )}

      {/* Table view: every price change in the window */}
      <TouchableOpacity onPress={() => setShowTable((v) => !v)} accessibilityRole="button">
        <Text style={[styles.tableToggle, { color: colors.primary }]}>
          {showTable ? "Hide price changes" : `Show price changes (${series.changes.length})`}
        </Text>
      </TouchableOpacity>
      {showTable && (
        <View style={[styles.table, { borderColor: colors.border }]}>
          {series.changes.length === 0 ? (
            <Text style={[styles.note, { color: colors.subtext, margin: 10 }]}>No changes in this period.</Text>
          ) : (
            series.changes.map((c, i) => {
              const prev = series.changes[i + 1];
              const delta = prev ? c.price - prev.price : null;
              return (
                <View key={`${c.at}-${i}`} style={[styles.tableRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Text style={[styles.tableDate, { color: colors.subtext }]}>{longDate(c.at)}</Text>
                  <Text style={[styles.tablePrice, { color: colors.text }]}>{money(c.price)}</Text>
                  <Text style={[styles.tableDelta, { color: colors.subtext }]}>
                    {delta == null || Math.abs(delta) < 0.005 ? "—" : `${delta > 0 ? "▲" : "▼"} ${money(Math.abs(delta))}`}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 },
  title: { fontSize: 16, fontWeight: "bold" },
  demoBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  demoText: { fontSize: 10, fontWeight: "600" },
  rangeRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  rangeChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, minWidth: 40, alignItems: "center" },
  rangeText: { fontSize: 12, fontWeight: "700" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  stat: { flex: 1 },
  statLabel: { fontSize: 11, marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: "700" },
  verdict: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  tooltip: { position: "absolute", top: 0, width: 120, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  tooltipDate: { fontSize: 10 },
  tooltipPrice: { fontSize: 13, fontWeight: "700" },
  note: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  tableToggle: { fontSize: 13, fontWeight: "700", marginTop: 10 },
  table: { borderWidth: 1, borderRadius: 10, marginTop: 8 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8 },
  tableDate: { flex: 1, fontSize: 12 },
  tablePrice: { width: 80, fontSize: 13, fontWeight: "600", textAlign: "right" },
  tableDelta: { width: 80, fontSize: 12, textAlign: "right" },
});
