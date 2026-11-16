import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { TRANSLATIONS } from '../../constants/Translations';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { CourthousePillars } from '../../constants/Illustrations';

export default function RightsScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const rightsData = [
    {
      id: 'arrest',
      icon: '🛡️',
      title: 'Arrest & Custody Rights (BNSS / DK Basu)',
      provisions: ['Section 35, 36, 47, 57 of BNSS 2023'],
      points: [
        'Notice of Appearance: For offences punishable with up to 7 years, arrest is not automatic. Police must issue Section 35(3) Notice of Appearance.',
        'Arrest Memo: Police must prepare an Arrest Memo signed by at least one family member or local respectable witness.',
        'Right to Inform Family: You have the legal right to have a relative or friend immediately notified of your custody and location.',
        'Magistrate in 24 Hours: No person can be detained by police for more than 24 hours without being produced before a Magistrate.',
        'Advocate Presence: Right to meet an advocate of your choice during interrogation (Section 38 BNSS).'
      ]
    },
    {
      id: 'women',
      icon: '👩',
      title: "Women's Legal Safeguards & Sunset Rules",
      provisions: ['Section 43 BNSS 2023', 'Section 74, 75, 85 BNS 2023'],
      points: [
        'No Night Arrest: No woman shall be arrested after sunset and before sunrise except in extraordinary cases with prior written permission of Judicial Magistrate First Class.',
        'Female Officer Only: Only a female police officer may arrest and body-search a woman, with strict regard to decency.',
        'Zero FIR & Free Legal Aid: Women are unconditionally entitled to free legal aid through NALSA / DLSA and Tele-Law 14454.',
        'Women Helpline 181: 24/7 dedicated toll-free helpline for domestic abuse, assault, and safety intervention.'
      ]
    },
    {
      id: 'zero_fir',
      icon: '📝',
      title: 'FIR & Zero FIR Rights',
      provisions: ['Section 173 BNSS 2023'],
      points: [
        'Universal Jurisdiction (Zero FIR): A citizen can report a cognizable crime at ANY police station in India, irrespective of jurisdiction. The station must register a Zero FIR and transfer it.',
        'Free Copy: As per Section 173(2) BNSS, a copy of the recorded FIR must be provided to the informant immediately, free of cost.',
        'Remedy on Refusal: If an SHO refuses to register an FIR, you may submit the complaint by post/email to the Superintendent of Police (SP) or approach the Magistrate under Section 175 BNSS.'
      ]
    },
    {
      id: 'consumer',
      icon: '🛍️',
      title: 'Consumer Protection & e-Daakhil',
      provisions: ['Consumer Protection Act 2019, Section 34, 35, 39'],
      points: [
        'Pecuniary Jurisdiction: District Commission hears claims up to Rs 50 Lakhs; State Commission up to Rs 2 Crores; National Commission above Rs 2 Crores.',
        'Online Filing (e-Daakhil): Consumers can file complaints online without hiring a lawyer from the convenience of their home at edaakhil.nic.in.',
        'Reliefs: Replacement of defective goods, full refund with interest, and punitive damages for mental agony and harassment.',
        'Limitation Period: 2 years from the date the cause of action arose (Section 69).'
      ]
    },
    {
      id: 'rti',
      icon: '🔍',
      title: 'Right to Information (RTI Act 2005)',
      provisions: ['Section 6, 7, 19 RTI Act 2005'],
      points: [
        'Nominal Fee: Application fee is just Rs 10/-. Below Poverty Line (BPL) citizens pay Rs 0.',
        'No Reason Required: Under Section 6(2), you do NOT need to give any reason or justification for requesting information.',
        'Mandatory 30-Day Limit: Public authorities must respond within 30 days (or 48 hours if concerning life and liberty).',
        'Officer Penalties: Delays without cause attract a penalty of Rs 250 per day on the Public Information Officer (Section 20).'
      ]
    },
    {
      id: 'legal_aid',
      icon: '⚖️',
      title: 'Free Legal Aid (NALSA & Tele-Law)',
      provisions: ['Article 39A Constitution of India', 'Section 12 Legal Services Authorities Act'],
      points: [
        'Eligible Citizens: Women, children, SC/ST, custody inmates, disabled individuals, and citizens with low annual income receive free lawyer representation.',
        'Tele-Law Toll-Free 14454: Dial 14454 to speak directly to panel advocates across India for free preliminary legal advice and mediation.',
        'Lok Adalat: Quarterly court forum providing quick, amicable dispute resolution with no court fees and final non-appealable awards.'
      ]
    }
  ];

  return (
    <View style={styles.container}>
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <CourthousePillars size={28} color={Colors.gold} />
            <Text style={styles.screenHeading}>{t.rightsTitle}</Text>
          </View>
          <Text style={styles.screenSub}>
            Fundamental statutory rights, criminal procedure safeguards, and free legal aid mechanisms under Indian law.
          </Text>
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
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  screenSub: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  cardsWrap: {
    gap: 14,
  },
  rightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' },
      default: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
