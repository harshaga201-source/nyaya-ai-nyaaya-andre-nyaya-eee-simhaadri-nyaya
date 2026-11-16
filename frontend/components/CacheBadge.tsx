import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

interface CacheBadgeProps {
  cacheType?: string;
}

export const CacheBadge: React.FC<CacheBadgeProps> = ({ cacheType }) => {
  return (
    <View style={styles.badgeContainer}>
      <Text style={styles.badgeText}>
        ⚡ instant answer (cached{cacheType ? `: ${cacheType}` : ''})
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.cacheBadgeBg,
    borderColor: Colors.cacheBadgeBorder,
    borderWidth: 1,
    borderRadius: 16,
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
