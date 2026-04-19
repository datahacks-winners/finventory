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
          <View style={styles.handle} />
          <ScrollView style={styles.content}>
            {/* Species Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Species</Text>
              <View style={styles.chipContainer}>
                {COMMON_SPECIES.map((species) => (
                  <TouchableOpacity
                    key={species}
                    style={[
                      styles.chip,
                      localSpecies.includes(species) && styles.chipActive,
                    ]}
                    onPress={() => toggleSpecies(species)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        localSpecies.includes(species) && styles.chipTextActive,
                      ]}
                    >
                      {species}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Grade Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Grade</Text>
              <View style={styles.chipContainer}>
                {GRADES.map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    style={[
                      styles.chip,
                      localGrades.includes(grade) && styles.chipActive,
                    ]}
                    onPress={() => toggleGrade(grade)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        localGrades.includes(grade) && styles.chipTextActive,
                      ]}
                    >
                      {grade.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
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
                  <Text style={styles.sliderButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.sliderValue}>{localDistance}</Text>
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
              <Text style={styles.sectionTitle}>
                Price: ${localPriceRange[0]} - ${localPriceRange[1]}/{localDistance === 0 ? 'unit' : 'lb'}
              </Text>
              <View style={styles.priceRangeContainer}>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <TextInput
                    style={styles.priceInputField}
                    value={localPriceRange[0].toString()}
                    onChangeText={(text) =>
                      setLocalPriceRange([parseInt(text) || 0, localPriceRange[1]])
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.priceInput}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <TextInput
                    style={styles.priceInputField}
                    value={localPriceRange[1].toString()}
                    onChangeText={(text) =>
                      setLocalPriceRange([localPriceRange[0], parseInt(text) || 0])
                    }
                    keyboardType="numeric"
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
              <Text style={styles.applyButtonText}>Apply Filters</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 12,
    borderRadius: 2,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  sliderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButtonText: {
    fontSize: 24,
    color: '#374151',
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
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
    color: '#6B7280',
    marginBottom: 4,
  },
  priceInputField: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
