import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useBrowseStore } from '../stores/browseStore';
import { Grade } from '../types/listing';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
}

const COMMON_SPECIES = [
  'Salmon', 'Tuna', 'Cod', 'Halibut', 'Snapper',
  'Shrimp', 'Crab', 'Lobster', 'Scallops', 'Mussels',
];

const GRADES: Grade[] = ['sushi', 'A', 'B'];

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
};

// MD3 Grade chip colors
const gradeChipColors = {
  sushi: {
    bg: '#005f93',
    text: '#ffffff',
  },
  A: {
    bg: '#1e78b4',
    text: '#f7f9ff',
  },
  B: {
    bg: '#fdac6a',
    text: '#773e01',
  },
};

export function FilterSheet({ visible, onClose }: FilterSheetProps) {
  const { filters, setFilters, resetFilters } = useBrowseStore();
  const [localSpecies, setLocalSpecies] = useState<string[]>(filters.species);
  const [localGrades, setLocalGrades] = useState<Grade[]>(filters.grades);
  const [localDistance, setLocalDistance] = useState(filters.distance);
  const [localPriceRange, setLocalPriceRange] = useState(filters.priceRange);

  React.useEffect(() => {
    if (visible) {
      setLocalSpecies(filters.species);
      setLocalGrades(filters.grades);
      setLocalDistance(filters.distance);
      setLocalPriceRange(filters.priceRange);
    }
  }, [visible, filters]);

  const handleApply = () => {
    setFilters({
      species: localSpecies,
      grades: localGrades,
      distance: localDistance,
      priceRange: localPriceRange,
    });
    onClose();
  };

  const handleReset = () => {
    resetFilters();
    onClose();
  };

  const toggleSpecies = (species: string) => {
    setLocalSpecies((prev) =>
      prev.includes(species)
        ? prev.filter((s) => s !== species)
        : [...prev, species]
    );
  };

  const toggleGrade = (grade: Grade) => {
    setLocalGrades((prev) =>
      prev.includes(grade)
        ? prev.filter((g) => g !== grade)
        : [...prev, grade]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Filters</Text>
              <Text style={styles.headerSubtitle}>Refine your catch</Text>
            </View>

            {/* Species Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Species</Text>
              <View style={styles.chipContainer}>
                {COMMON_SPECIES.map((species) => {
                  const isActive = localSpecies.includes(species);
                  return (
                    <TouchableOpacity
                      key={species}
                      style={[
                        styles.chip,
                        isActive && styles.chipActive,
                      ]}
                      onPress={() => toggleSpecies(species)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isActive && styles.chipTextActive,
                        ]}
                      >
                        {species}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Grade Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Grade</Text>
              <View style={styles.chipContainer}>
                {GRADES.map((grade) => {
                  const isActive = localGrades.includes(grade);
                  const gradeColors = gradeChipColors[grade];
                  return (
                    <TouchableOpacity
                      key={grade}
                      style={[
                        styles.gradeChip,
                        isActive && { backgroundColor: gradeColors.bg, borderColor: gradeColors.bg },
                      ]}
                      onPress={() => toggleGrade(grade)}
                    >
                      <Text
                        style={[
                          styles.gradeChipText,
                          isActive && { color: gradeColors.text },
                        ]}
                      >
                        {grade === 'sushi' ? 'SUSHI' : `GRADE ${grade}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Distance Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Distance: {localDistance === 0 ? 'Any' : `${localDistance} mi`}
              </Text>
              <View style={styles.sliderContainer}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setLocalDistance(Math.max(0, localDistance - 5))}
                >
                  <Text style={styles.sliderButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.sliderValue}>{localDistance === 0 ? '∞' : localDistance}</Text>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setLocalDistance(Math.min(100, localDistance + 5))}
                >
                  <Text style={styles.sliderButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Price Range Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Range</Text>
              <View style={styles.priceRangeContainer}>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>Min ($)</Text>
                  <TextInput
                    style={styles.priceInputField}
                    value={localPriceRange[0].toString()}
                    onChangeText={(text) =>
                      setLocalPriceRange([parseInt(text) || 0, localPriceRange[1]])
                    }
                    keyboardType="numeric"
                    placeholderTextColor={colors.outline}
                  />
                </View>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>Max ($)</Text>
                  <TextInput
                    style={styles.priceInputField}
                    value={localPriceRange[1].toString()}
                    onChangeText={(text) =>
                      setLocalPriceRange([localPriceRange[0], parseInt(text) || 0])
                    }
                    keyboardType="numeric"
                    placeholderTextColor={colors.outline}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(36, 25, 17, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: 8,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.02,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
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
    justifyContent: 'center',
    gap: 24,
  },
  sliderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sliderButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
  },
  sliderValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    minWidth: 50,
    textAlign: 'center',
    fontFamily: 'Caveat',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInput: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  priceInputField: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  applyButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
