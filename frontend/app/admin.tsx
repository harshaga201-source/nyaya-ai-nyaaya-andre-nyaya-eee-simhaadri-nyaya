import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Header } from '../components/Header';
import { LanguageContext } from './_layout';
import { getUI } from '../constants/Translations';
import { fetchAdminStats, getBackendUrl } from '../services/api';

export default function AdminScreen() {
  const router = useRouter();
  const { language, setLanguage } = useContext(LanguageContext);
  const t = getUI(language);

  const [stats, setStats] = useState<any>(null);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const s = await fetchAdminStats();
      setStats(s);

      const baseUrl = getBackendUrl();
      const fbRes = await fetch(`${baseUrl}/admin/feedback`);
      if (fbRes.ok) {
        setFeedbackList(await fbRes.json());
      }

      const logRes = await fetch(`${baseUrl}/admin/logs`);
      if (logRes.ok) {
        setChatLogs(await logRes.json());
      }
    } catch (e) {
      console.warn('Admin load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <View style={styles.container}>
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>{t.backToApp}</Text>
          </TouchableOpacity>
          <Text style={styles.adminTitle}>{t.adTitle}</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
            <Text style={styles.refreshText}>{t.refresh}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={Colors.gold} />
          </View>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{t.adTotal}</Text>
                <Text style={styles.kpiValue}>{stats?.total_queries ?? 0}</Text>
                <Text style={styles.kpiSub}>{t.adProcessed}</Text>
              </View>

              <View style={[styles.kpiCard, styles.kpiHighlight]}>
                <Text style={styles.kpiLabel}>{t.adCacheRate}</Text>
                <Text style={[styles.kpiValue, { color: Colors.goldDark }]}>
                  {stats?.cache_hit_rate_percent ?? 0}%
                </Text>
                <Text style={styles.kpiSub}>{t.adCaching}</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{t.adLatency}</Text>
                <Text style={styles.kpiValue}>{stats?.avg_response_time_ms ?? 0} ms</Text>
                <Text style={styles.kpiSub}>{t.adFast}</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{t.adFeedback}</Text>
                <Text style={styles.kpiValue}>
                  {stats?.total_feedback ?? 0} ({stats?.avg_rating ?? 5.0} ★)
                </Text>
                <Text style={styles.kpiSub}>{t.adFlaggedCount}{stats?.flagged_count ?? 0}</Text>
              </View>
            </View>

            {/* Flagged and Recent Feedback */}
            <View style={styles.tableCard}>
              <Text style={styles.sectionHeading}>{t.adFeedbackHeading}</Text>
              {feedbackList.length === 0 ? (
                <Text style={styles.emptyText}>{t.adNoFeedback}</Text>
              ) : (
                feedbackList.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.feedbackItem, item.is_flagged && styles.flaggedItem]}
                  >
                    <View style={styles.fbHead}>
                      <Text style={styles.fbCategory}>{item.category.toUpperCase()}</Text>
                      <Text style={styles.fbRating}>{'★'.repeat(item.rating)}</Text>
                      {item.is_flagged ? (
                        <View style={styles.flagBadge}>
                          <Text style={styles.flagText}>{t.adFlagged}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.fbComment}>
                      {item.comment || t.noComment}
                    </Text>
                    <Text style={styles.fbDate}>{item.created_at}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Recent Queries & Cache Speed-up Log */}
            <View style={styles.tableCard}>
              <Text style={styles.sectionHeading}>{t.adTelemetry}</Text>
              {chatLogs.length === 0 ? (
                <Text style={styles.emptyText}>{t.adNoLogs}</Text>
              ) : (
                chatLogs.slice(0, 15).map((log) => (
                  <View key={log.id} style={styles.logItem}>
                    <View style={styles.logTop}>
                      <Text style={styles.logLang}>[{log.language.toUpperCase()}]</Text>
                      <Text style={styles.logQ} numberOfLines={1}>{log.question}</Text>
                      <View
                        style={[
                          styles.cachePill,
                          log.cached ? styles.cachePillHit : styles.cachePillMiss,
                        ]}
                      >
                        <Text style={styles.cachePillText}>
                          {log.cached ? t.adCacheHit : t.adRagRun}
                        </Text>
                      </View>
                      <Text style={styles.logTime}>{log.response_time_ms} ms</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
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
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
  },
  refreshBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshText: {
    color: '#FFFDF7',
    fontSize: 12,
    fontWeight: '700',
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 16,
    borderColor: Colors.cardBorder,
    borderWidth: 2,
  },
  kpiHighlight: {
    borderColor: Colors.gold,
    borderWidth: 3,
  },
  kpiLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  tableCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 18,
    borderColor: Colors.cardBorder,
    borderWidth: 2,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DC',
    paddingBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  feedbackItem: {
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 12,
    marginBottom: 8,
    borderColor: '#111111',
    borderWidth: 2,
  },
  flaggedItem: {
    backgroundColor: '#FFE9E3',
    borderColor: '#FF3B00',
  },
  fbHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  fbCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.navy,
  },
  fbRating: {
    color: '#FFD400',
    fontSize: 13,
  },
  flagBadge: {
    backgroundColor: '#FF3B00',
    borderRadius: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  flagText: {
    color: '#FFFDF7',
    fontSize: 10,
    fontWeight: '800',
  },
  fbComment: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  fbDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  logItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DC',
  },
  logTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logLang: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.navy,
  },
  logQ: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
  },
  cachePill: {
    borderRadius: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cachePillHit: {
    backgroundColor: '#FFD400',
  },
  cachePillMiss: {
    backgroundColor: '#ECE7DC',
  },
  cachePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.navy,
  },
  logTime: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
