import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { CitationItem } from '../services/api';
import { getUI } from '../constants/Translations';

interface CitationChipsProps {
  citations: CitationItem[];
  onSelectCitation?: (citation: CitationItem) => void;
  language?: string;
}

export const CitationChips: React.FC<CitationChipsProps> = ({ citations, onSelectCitation, language = 'en' }) => {
  const t = getUI(language);
  if (!citations || citations.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.headerLabel}>{t.citationsLabel}</Text>
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
    borderTopColor: '#111111',
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
    backgroundColor: '#ECE7DC',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
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
