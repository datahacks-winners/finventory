import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const colors = {
  surface: '#fff8f5',
  surfaceContainer: '#ffeadc',
  surfaceContainerLow: '#fff1e9',
  surfaceContainerHighest: '#f3dfd1',
  onSurface: '#241911',
  onSurfaceVariant: '#404750',
  outline: '#707881',
  outlineVariant: '#c0c7d1',
  primary: '#005f93',
  primaryContainer: '#1e78b4',
  onPrimary: '#ffffff',
  primaryFixed: '#cde5ff',
  chartBlue: '#1a8fd1',
  chartBlueFaint: '#1a8fd126',
};

// CalCOFI egg density data from chart_temp_bins.json
const TEMP_DATA = [
  { temp: 6,  mean: 2.17, n: 6 },
  { temp: 8,  mean: 1.80, n: 17 },
  { temp: 10, mean: 2.14, n: 177 },
  { temp: 12, mean: 2.09, n: 725 },
  { temp: 14, mean: 2.16, n: 727 },
  { temp: 16, mean: 2.02, n: 311 },
  { temp: 18, mean: 2.10, n: 132 },
  { temp: 20, mean: 1.92, n: 44 },
  { temp: 22, mean: 1.80, n: 25 },
  { temp: 24, mean: 1.63, n: 13 },
  { temp: 26, mean: 1.42, n: 5 },
];

const MIN_MEAN = 1.2;
const MAX_MEAN = 2.4;
const BAR_MAX_HEIGHT = 120;

function barHeight(mean: number) {
  return ((mean - MIN_MEAN) / (MAX_MEAN - MIN_MEAN)) * BAR_MAX_HEIGHT;
}

export default function ImpactScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Finventory</Text>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>CalCOFI Survey Data</Text>
        <Text style={styles.heroTitle}>Warming Oceans,{'\n'}Fewer Fish</Text>
        <Text style={styles.heroSubtitle}>
          Why every rescued pound of catch matters more each year
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

        {/* Chart Card */}
        <View style={styles.card}>
          <Text style={styles.chartTitle}>Egg Density vs. Surface Temperature</Text>
          <Text style={styles.chartSubtitle}>Mean log₁₀(eggs / 10 m²) · dot size = sample count</Text>

          {/* Bar chart */}
          <View style={styles.chartArea}>
            <View style={styles.barsRow}>
              {TEMP_DATA.map((d) => (
                <View key={d.temp} style={styles.barCol}>
                  <View style={[styles.bar, { height: barHeight(d.mean), opacity: d.temp >= 18 ? 1 : 0.65 }]}>
                    {d.temp >= 18 && (
                      <View style={styles.barHighlight} />
                    )}
                  </View>
                  <Text style={styles.barLabel}>{d.temp}</Text>
                </View>
              ))}
            </View>
            <View style={styles.xAxisLabel}>
              <Text style={styles.axisText}>Surface Temperature (°C)</Text>
            </View>
          </View>

          {/* Legend note */}
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.chartBlue, opacity: 0.65 }]} />
            <Text style={styles.legendText}>Peak spawning range (6–16°C)</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.chartBlue }]} />
            <Text style={styles.legendText}>Declining density (18°C+)</Text>
          </View>
        </View>

        {/* Key finding */}
        <View style={styles.findingCard}>
          <Text style={styles.findingIcon}>🌡️</Text>
          <Text style={styles.findingTitle}>34% drop in egg density</Text>
          <Text style={styles.findingText}>
            From peak spawning temperatures (12–14°C) to 26°C, mean larval egg density falls from 2.16 to 1.42 log₁₀(eggs/10 m²) — a reduction of roughly 75% in actual egg counts.
          </Text>
        </View>

        {/* Why it matters */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Why This Drives Our Mission</Text>
          <View style={styles.bulletList}>
            {[
              { icon: '📉', text: 'Warmer surface water directly suppresses spawning success across all monitored species.' },
              { icon: '⚠️', text: 'As future catches shrink, every pound of surplus seafood that reaches a buyer instead of a landfill counts more than ever.' },
              { icon: '🔗', text: 'Finventory\'s real-time surplus matching preserves the value of what\'s already been caught — reducing the pressure to overfish depleted stocks.' },
            ].map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletIcon}>{item.icon}</Text>
                <Text style={styles.bulletText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Data source */}
        <View style={styles.sourceCard}>
          <Text style={styles.sourceLabel}>DATA SOURCE</Text>
          <Text style={styles.sourceText}>CalCOFI (California Cooperative Oceanic Fisheries Investigations) larval egg surveys · 2°C bins · n = 2,182 tows</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  logo: { fontFamily: 'Caveat', fontSize: 28, fontWeight: '700', color: colors.primary },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  heroLabel: { fontFamily: 'Caveat', fontSize: 22, color: colors.primaryFixed, marginBottom: 4 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.onPrimary, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, color: colors.primaryFixed, marginTop: 6, opacity: 0.9 },
  content: { flex: 1 },
  contentContainer: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: colors.onSurface, marginBottom: 2 },
  chartSubtitle: { fontSize: 11, color: colors.outline, marginBottom: 16 },
  chartArea: { marginTop: 8 },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT + 8,
    gap: 4,
    paddingBottom: 4,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: {
    width: '100%',
    backgroundColor: colors.chartBlue,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barHighlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ff6b35',
    opacity: 0.25,
  },
  barLabel: { fontSize: 8, color: colors.outline, marginTop: 4, fontWeight: '600' },
  xAxisLabel: { alignItems: 'center', marginTop: 4 },
  axisText: { fontSize: 10, color: colors.outline, fontWeight: '600', letterSpacing: 0.3 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.chartBlue },
  legendText: { fontSize: 12, color: colors.onSurfaceVariant },
  findingCard: {
    backgroundColor: colors.primaryFixed,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  findingIcon: { fontSize: 36, marginBottom: 8 },
  findingTitle: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 8 },
  findingText: { fontSize: 14, color: colors.onSurface, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.onSurface, marginBottom: 14 },
  bulletList: { gap: 12 },
  bulletRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bulletIcon: { fontSize: 18, lineHeight: 22 },
  bulletText: { flex: 1, fontSize: 14, color: colors.onSurfaceVariant, lineHeight: 20 },
  sourceCard: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 12,
    padding: 16,
  },
  sourceLabel: { fontSize: 10, fontWeight: '700', color: colors.outline, letterSpacing: 1, marginBottom: 4 },
  sourceText: { fontSize: 12, color: colors.onSurfaceVariant, lineHeight: 18 },
});
