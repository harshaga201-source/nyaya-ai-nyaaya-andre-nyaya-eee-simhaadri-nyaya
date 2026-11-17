import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, BORDER, BORDER_THIN } from '../../constants/Colors';
import { getUI } from '../../constants/Translations';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { ScalesOfJustice, GavelIcon, CourthousePillars, LawBooks } from '../../constants/Illustrations';

export default function HomeScreen() {
  const router = useRouter();
  const { language, setLanguage } = useContext(LanguageContext);
  const t = getUI(language);

  const features = [
    {
      id: 'document',
      title: t.docReaderTitle,
      description: t.docReaderDesc,
      icon: <LawBooks size={36} color={Colors.ink} />,
      route: '/document',
    },
    {
      id: 'traffic',
      title: t.trafficTitle,
      description: t.trafficDesc,
      icon: <GavelIcon size={36} color={Colors.ink} />,
      route: '/traffic',
    },
    {
      id: 'complaint',
      title: t.complaintTitle,
      description: t.complaintDesc,
      icon: <CourthousePillars size={36} color={Colors.ink} />,
      route: '/complaint',
    },
    {
      id: 'lawyers',
      title: t.lawyerTitle,
      description: t.lawyerDesc,
      icon: <ScalesOfJustice size={36} color={Colors.ink} />,
      route: '/find-lawyer',
    },
    {
      id: 'rights',
      title: t.rightsTitle,
      description: t.rightsDesc,
      icon: <CourthousePillars size={36} color={Colors.ink} />,
      route: '/rights',
    },
    {
      id: 'feedback',
      title: t.feedbackTab,
      description: t.feedbackDesc,
      icon: <LawBooks size={36} color={Colors.ink} />,
      route: '/feedback',
    },
  ];

  return (
    <View style={styles.container}>
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Justice-Themed Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t.heroBadge}</Text>
            </View>
            <TouchableOpacity
              style={styles.adminLink}
              onPress={() => router.push('/admin')}
            >
              <Text style={styles.adminLinkText}>⚙️ {t.adminTab}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroTitle}>{t.heroTitle}</Text>
          <Text style={styles.heroDesc}>{t.heroDescription}</Text>

          <View style={styles.actionButtonsRow}>
            {/* Big Ask by Voice */}
            <TouchableOpacity
              style={[styles.bigButton, styles.voiceButton]}
              activeOpacity={0.85}
              onPress={() => router.push('/voice')}
            >
              <Text style={styles.bigButtonIcon}>🎙️</Text>
              <View>
                <Text style={styles.bigButtonTitle}>{t.askByVoice}</Text>
                <Text style={styles.bigButtonSub}>{t.voiceSubtitle}</Text>
              </View>
            </TouchableOpacity>

            {/* Big Ask by Typing */}
            <TouchableOpacity
              style={[styles.bigButton, styles.typeButton]}
              activeOpacity={0.85}
              onPress={() => router.push('/chat')}
            >
              <Text style={styles.bigButtonIcon}>💬</Text>
              <View>
                <Text style={[styles.bigButtonTitle, { color: Colors.ink }]}>{t.askByTyping}</Text>
                <Text style={[styles.bigButtonSub, { color: Colors.faintInk }]}>{t.typingSubtitle}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.gridSection}>
          <Text style={styles.sectionTitle}>{t.workflowsTitle}</Text>
          <View style={styles.cardsGrid}>
            {features.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.featureCard}
                activeOpacity={0.85}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.cardIconWrapper}>{item.icon}</View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.description}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardActionText}>{t.launchTool}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legal Disclaimer Footer */}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>⚖️ {t.disclaimer}</Text>
          <Text style={styles.subDisclaimer}>{t.footerNote}</Text>
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
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  heroCard: {
    backgroundColor: Colors.yellow,
    padding: 22,
    borderWidth: BORDER + 1,
    borderColor: Colors.pitchBlack,
    marginBottom: 20,
    ...Platform.select({
      web: { boxShadow: '8px 8px 0 #111111' },
      default: { elevation: 4 },
    }),
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: Colors.pitchBlack,
    borderColor: Colors.pitchBlack,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: Colors.yellow,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  adminLink: {
    backgroundColor: Colors.pitchBlack,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: Colors.pitchBlack,
  },
  adminLinkText: {
    color: Colors.yellow,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.ink,
    lineHeight: 34,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  heroDesc: {
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.ink,
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButtonsRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 12,
  },
  bigButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 0,
    borderWidth: BORDER,
    borderColor: Colors.pitchBlack,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '5px 5px 0 #111111',
      },
      default: { elevation: 4 },
    }),
  },
  voiceButton: {
    backgroundColor: Colors.pitchBlack,
  },
  typeButton: {
    backgroundColor: Colors.card,
  },
  bigButtonIcon: {
    fontSize: 30,
    marginRight: 12,
  },
  bigButtonTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.yellow,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bigButtonSub: {
    fontSize: 12,
    color: '#D9D7CF',
    marginTop: 2,
  },
  gridSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.yellow,
    backgroundColor: Colors.pitchBlack,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  featureCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 16,
    borderColor: Colors.cardBorder,
    borderWidth: 2,
    width: Platform.OS === 'web' ? '48%' : '100%',
    minWidth: 280,
    flexGrow: 1,
    ...Platform.select({
      web: {
        boxShadow: '5px 5px 0 #111111',
        cursor: 'pointer',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  cardIconWrapper: {
    backgroundColor: Colors.yellow,
    alignSelf: 'flex-start',
    borderRadius: 0,
    padding: 8,
    marginBottom: 10,
    borderColor: Colors.pitchBlack,
    borderWidth: BORDER_THIN,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.ink,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.mutedInk,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    borderTopWidth: BORDER_THIN,
    borderTopColor: Colors.pitchBlack,
    paddingTop: 10,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    backgroundColor: Colors.yellow,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: BORDER_THIN,
    borderColor: Colors.pitchBlack,
  },
  disclaimerContainer: {
    backgroundColor: '#ECE7DC',
    borderRadius: 0,
    padding: 14,
    borderWidth: 2,
    borderColor: '#111111',
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 4,
  },
  subDisclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
