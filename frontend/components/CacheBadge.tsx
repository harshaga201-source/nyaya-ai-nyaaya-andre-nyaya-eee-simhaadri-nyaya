import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { getUI } from '../constants/Translations';

interface CacheBadgeProps {
  cacheType?: string;
  language?: string;
}

export const CacheBadge: React.FC<CacheBadgeProps> = ({ cacheType, language = 'en' }) => {
  const t = getUI(language);
  const kind = (cacheType || '').toLowerCase();
  const label =
    kind.includes('semantic')
      ? t.cacheSemantic
      : kind.includes('exact')
      ? t.cacheExact
      : t.cacheGeneric;

  return (
    <View style={styles.badgeContainer}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.cacheBadgeBg,
    borderColor: Colors.cacheBadgeBorder,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  badgeText: {
    color: Colors.cacheBadgeText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
