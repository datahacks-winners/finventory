import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

// Stitch Theme
const colors = {
  surface: '#fff8f5',
  surfaceContainer: '#ffeadc',
  surfaceContainerLow: '#fff1e9',
  surfaceContainerHigh: '#f9e4d7',
  onSurface: '#241911',
  onSurfaceVariant: '#404750',
  outline: '#707881',
  outlineVariant: '#c0c7d1',
  primary: '#005f93',
  primaryContainer: '#1e78b4',
  onPrimary: '#ffffff',
  primaryFixed: '#cde5ff',
  secondary: '#8c4f14',
  secondaryContainer: '#fdac6a',
  onSecondary: '#ffffff',
  tertiary: '#725c07',
  tertiaryContainer: '#c5a952',
};

const COMMON_SPECIES = ['Salmon', 'Tuna', 'Cod', 'Halibut', 'Shrimp'];
const GRADES = ['sushi', 'A', 'B'];

export default function StandingOrdersScreen() {
  const [creating, setCreating] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState(25);
  const [maxPrice, setMaxPrice] = useState('');

  const toggleSpecies = (species: string) => {
    setSelectedSpecies((prev) =>
      prev.includes(species) ? prev.filter((s) => s !== species) : [...prev, species]
    );
  };

  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const gradeColors: Record<string, { bg: string; text: string }> = {
    sushi: { bg: '#005f93', text: '#ffffff' },
    A: { bg: '#1e78b4', text: '#f7f9ff' },
    B: { bg: '#fdac6a', text: '#773e01' },
  };

  return (
    <View style={styles.container}>
      {/* Header - White with Logo */}
      <View style={styles.header}>
        <Text style={styles.logo}>Finventory</Text>
      </View>

      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Automation</Text>
        <Text style={styles.heroTitle}>Standing Orders</Text>
        <Text style={styles.heroSubtitle}>
          Set criteria to auto-reserve matching catch
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {!creating ? (
          <>
            {/* Info Card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>⚓</Text>
              <Text style={styles.infoTitle}>Never miss fresh catch</Text>
              <Text style={styles.infoText}>
                Set up standing orders to automatically get notified when new listings match your criteria. Perfect for restaurants with regular seafood needs.
              </Text>
              <TouchableOpacity style={styles.createButton} onPress={() => setCreating(true)}>
                <Text style={styles.createButtonText}>Create Standing Order</Text>
              </TouchableOpacity>
            </View>

            {/* Active Order Card */}
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderIconContainer}>
                  <Text style={styles.orderIcon}>🐟</Text>
                </View>
                <View style={styles.orderMeta}>
                  <Text style={styles.orderTitle}>Salmon Standing Order</Text>
                  <Text style={styles.orderStatus}>Active • 2 matches today</Text>
                </View>
              </View>
              <View style={styles.orderDetails}>
                <View style={styles.orderChip}>
                  <Text style={styles.orderChipText}>Grade A-B</Text>
                </View>
                <View style={styles.orderChip}>
                  <Text style={styles.orderChipText}>Within 15 mi</Text>
                </View>
                <View style={styles.orderChip}>
                  <Text style={styles.orderChipText}>Max $12/lb</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>New Order</Text>
            <Text style={styles.formTitle}>Create Standing Order</Text>

            {/* Species */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Target Species</Text>
              <View style={styles.chipGrid}>
                {COMMON_SPECIES.map((species) => {
                  const isActive = selectedSpecies.includes(species);
                  return (
                    <TouchableOpacity
                      key={species}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => toggleSpecies(species)}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {species}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Grades */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Grade Range</Text>
              <View style={styles.chipGrid}>
                {GRADES.map((grade) => {
                  const isActive = selectedGrades.includes(grade);
                  const gColors = gradeColors[grade];
                  return (
                    <TouchableOpacity
                      key={grade}
                      style={[styles.gradeChip, isActive && { backgroundColor: gColors.bg, borderColor: gColors.bg }]}
                      onPress={() => toggleGrade(grade)}
                    >
                      <Text style={[styles.gradeChipText, isActive && { color: gColors.text }]}>
                        {grade === 'sushi' ? 'SUSHI' : `GRADE ${grade}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Distance */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Max Distance: {maxDistance} mi</Text>
              <View style={styles.sliderContainer}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setMaxDistance(Math.max(5, maxDistance - 5))}
                >
                  <Text style={styles.sliderButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.sliderValue}>{maxDistance}</Text>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setMaxDistance(Math.min(100, maxDistance + 5))}
                >
                  <Text style={styles.sliderButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Price */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Max Price per lb ($)</Text>
              <TextInput
                style={styles.priceInput}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.outline}
              />
            </View>

            {/* Actions */}
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setCreating(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  logo: {
    fontFamily: 'Caveat',
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  heroLabel: {
    fontFamily: 'Caveat',
    fontSize: 22,
    color: colors.primaryFixed,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.onPrimary,
    letterSpacing: -0.02,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.primaryFixed,
    marginTop: 6,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  infoIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  orderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderIcon: {
    fontSize: 24,
  },
  orderMeta: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  orderStatus: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  orderDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  orderChip: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  orderChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  formLabel: {
    fontFamily: 'Caveat',
    fontSize: 20,
    color: colors.primary,
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -0.02,
    marginBottom: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  gradeChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  gradeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sliderButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
  },
  sliderValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    minWidth: 40,
    textAlign: 'center',
    fontFamily: 'Caveat',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainer,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  bottomPadding: {
    height: 24,
  },
});
