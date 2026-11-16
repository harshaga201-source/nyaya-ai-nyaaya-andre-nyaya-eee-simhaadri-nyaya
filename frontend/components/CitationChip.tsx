import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { CitationItem } from '../services/api';

interface CitationChipsProps {
  citations: CitationItem[];
  onSelectCitation?: (citation: CitationItem) => void;
}

export const CitationChips: React.FC<CitationChipsProps> = ({ citations, onSelectCitation }) => {
  if (!citations || citations.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.headerLabel}>Statutory Citations:</Text>
      <View style={styles.chipsWrapper}>
        {citations.map((c, idx) => (
          <TouchableOpacity
            key={`${c.act}-${c.section}-${idx}`}
            style={styles.chip}
            activeOpacity={0.8}
            onPress={() => onSelectCitation && onSelectCitation(c)}
          >
            <Text style={styles.chipIcon}>📜</Text>
            <Text style={styles.chipText} numberOfLines={1}>
              {c.section ? `${c.act}, ${c.section}` : c.act}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 260,
  },
  chipIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.navy,
  },
});
