import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { getUI } from '../../constants/Translations';
import { RIGHTS_CONTENT } from '../../constants/RightsContent';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { CourthousePillars } from '../../constants/Illustrations';

export default function RightsScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = getUI(language);
  const rights = RIGHTS_CONTENT[language] || RIGHTS_CONTENT.en;
  const rightsData = rights.sections.map((section, idx) => ({
    id: `rights-${idx}`,
    ...section,
  }));

  return (
    <View style={styles.container}>
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <CourthousePillars size={28} color={Colors.gold} />
            <Text style={styles.screenHeading}>{t.rightsTitle}</Text>
          </View>
          <Text style={styles.screenSub}>{rights.subtitle}</Text>
        </View>

        <View style={styles.cardsWrap}>
          {rightsData.map((item) => (
            <View key={item.id} style={styles.rightCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.provisions}>{item.provisions.join(' • ')}</Text>
                </View>
              </View>

              <View style={styles.pointsWrap}>
                {item.points.map((pt, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>▸</Text>
                    <Text style={styles.bulletText}>{pt}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footerDisclaimer}>
          <Text style={styles.footText}>⚖️ {t.disclaimer}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  topCard: {
    backgroundColor: Colors.navy,
    borderRadius: 0,
    padding: 18,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: Colors.gold,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFDF7',
    marginLeft: 10,
  },
  screenSub: {
    fontSize: 13,
    color: '#111111',
    lineHeight: 18,
  },
  cardsWrap: {
    gap: 14,
  },
  rightCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 18,
    borderColor: Colors.cardBorder,
    borderWidth: 2,
    ...Platform.select({
      web: { boxShadow: '5px 5px 0 #111111' },
      default: { elevation: 4 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DC',
    paddingBottom: 10,
  },
  itemIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.navy,
  },
  provisions: {
    fontSize: 11.5,
    color: Colors.goldDark,
    fontWeight: '700',
    marginTop: 2,
  },
  pointsWrap: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletDot: {
    fontSize: 12,
    color: Colors.gold,
    marginRight: 6,
    marginTop: 3,
  },
  bulletText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 19,
    flex: 1,
  },
  footerDisclaimer: {
    marginTop: 16,
    alignItems: 'center',
  },
  footText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
