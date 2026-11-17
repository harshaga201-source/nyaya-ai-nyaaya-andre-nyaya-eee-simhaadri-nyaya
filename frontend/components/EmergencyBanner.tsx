import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { EmergencyPayload } from '../services/api';
import { getUI } from '../constants/Translations';

interface EmergencyBannerProps {
  emergency: EmergencyPayload;
  language?: string;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ emergency, language = 'en' }) => {
  const t = getUI(language);
  if (!emergency || !emergency.is_emergency) return null;

  const handleCall = (num: string) => {
    const cleanNum = num.replace(/[^\d]/g, '');
    const telUrl = `tel:${cleanNum}`;
    if (Platform.OS === 'web') {
      window.open(telUrl, '_self');
    } else {
      Linking.openURL(telUrl).catch(err => console.warn('Could not dial:', err));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.alertIcon}>🚨</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t.emTitle}</Text>
          <Text style={styles.subtitle}>
            {emergency.advisory || t.emAdvisory}
          </Text>
        </View>
      </View>

      <View style={styles.helplinesGrid}>
        {(emergency.helplines || []).map((h, i) => (
          <TouchableOpacity
            key={`${h.number}-${i}`}
            style={styles.helplineCard}
            activeOpacity={0.8}
            onPress={() => handleCall(h.number)}
          >
            <View style={styles.badgeNumber}>
              <Text style={styles.numberText}>{h.number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceName}>{h.service}</Text>
              <Text style={styles.serviceDesc} numberOfLines={1}>{h.description}</Text>
            </View>
            <Text style={styles.callAction}>{t.emCall}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.emergencyBg,
    borderColor: Colors.emergencyBorder,
    borderWidth: 3,
    borderRadius: 0,
    padding: 12,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.emergencyText,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#C22A00',
    marginTop: 2,
    lineHeight: 16,
  },
  helplinesGrid: {
    gap: 8,
  },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    borderColor: '#FF3B00',
    borderWidth: 2,
    borderRadius: 0,
    padding: 8,
  },
  badgeNumber: {
    backgroundColor: '#FF3B00',
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  numberText: {
    color: '#FFFDF7',
    fontWeight: '800',
    fontSize: 14,
  },
  serviceName: {
    fontWeight: '700',
    fontSize: 13,
    color: '#111111',
  },
  serviceDesc: {
    fontSize: 11,
    color: '#6B6963',
  },
  callAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF3B00',
    marginLeft: 8,
  },
});
