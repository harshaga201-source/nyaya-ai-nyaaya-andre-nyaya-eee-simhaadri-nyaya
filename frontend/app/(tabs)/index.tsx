import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { TRANSLATIONS } from '../../constants/Translations';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { ScalesOfJustice, GavelIcon, CourthousePillars, LawBooks } from '../../constants/Illustrations';

export default function HomeScreen() {
  const router = useRouter();
  const { language, setLanguage } = useContext(LanguageContext);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const features = [
    {
      id: 'document',
      title: t.docReaderTitle,
      description: t.docReaderDesc,
      icon: <LawBooks size={36} color={Colors.gold} />,
      route: '/document',
    },
    {
      id: 'traffic',
      title: t.trafficTitle,
      description: t.trafficDesc,
      icon: <GavelIcon size={36} color={Colors.gold} />,
      route: '/traffic',
    },
    {
      id: 'complaint',
      title: t.complaintTitle,
      description: t.complaintDesc,
      icon: <CourthousePillars size={36} color={Colors.gold} />,
      route: '/complaint',
    },
    {
      id: 'lawyers',
      title: t.lawyerTitle,
      description: t.lawyerDesc,
      icon: <ScalesOfJustice size={36} color={Colors.gold} />,
      route: '/lawyers',
    },
    {
      id: 'rights',
      title: t.rightsTitle,
      description: t.rightsDesc,
      icon: <CourthousePillars size={36} color={Colors.navyLight} />,
      route: '/rights',
    },
    {
      id: 'feedback',
      title: t.feedbackTab,
      description: "Rate answers, submit suggestions, and view admin accuracy metrics.",
      icon: <LawBooks size={36} color={Colors.navyLight} />,
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
                <Text style={[styles.bigButtonTitle, { color: Colors.navy }]}>{t.askByTyping}</Text>
                <Text style={[styles.bigButtonSub, { color: Colors.textSecondary }]}>{t.typingSubtitle}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.gridSection}>
          <Text style={styles.sectionTitle}>Essential Legal Workflows</Text>
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
                  <Text style={styles.cardActionText}>Launch Tool →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legal Disclaimer Footer */}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>⚖️ {t.disclaimer}</Text>
          <Text style={styles.subDisclaimer}>
            NyayaSathi operates on verified statutory provisions (BNS, BNSS, BSA, MVA, CPA, RTI). In case of legal emergency, dial 112 or Tele-Law 14454.
          </Text>
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
    backgroundColor: Colors.navy,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(11, 31, 58, 0.15)',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: 'rgba(201, 162, 39, 0.2)',
    borderColor: Colors.gold,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  adminLink: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  adminLinkText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 14,
    color: '#E2E8F0',
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
    borderRadius: 14,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  voiceButton: {
    backgroundColor: Colors.gold,
  },
  typeButton: {
    backgroundColor: '#FFFFFF',
  },
  bigButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  bigButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navyDark,
  },
  bigButtonSub: {
    fontSize: 12,
    color: '#4B3F10',
    marginTop: 2,
  },
  gridSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    width: Platform.OS === 'web' ? '48%' : '100%',
    minWidth: 280,
    flexGrow: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        cursor: 'pointer',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  cardIconWrapper: {
    backgroundColor: '#F8F9FC',
    alignSelf: 'flex-start',
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.goldDark,
  },
  disclaimerContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
