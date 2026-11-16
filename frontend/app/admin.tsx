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
import { fetchAdminStats, getBackendUrl } from '../services/api';

export default function AdminScreen() {
  const router = useRouter();
  const { language, setLanguage } = useContext(LanguageContext);

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
            <Text style={styles.backText}>← Back to App</Text>
          </TouchableOpacity>
          <Text style={styles.adminTitle}>Admin Quality & Performance Control</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
            <Text style={styles.refreshText}>🔄 Refresh</Text>
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
                <Text style={styles.kpiLabel}>Total Queries</Text>
                <Text style={styles.kpiValue}>{stats?.total_queries ?? 0}</Text>
                <Text style={styles.kpiSub}>Processed by RAG Engine</Text>
              </View>

              <View style={[styles.kpiCard, styles.kpiHighlight]}>
                <Text style={styles.kpiLabel}>Cache Hit Rate</Text>
                <Text style={[styles.kpiValue, { color: Colors.goldDark }]}>
                  {stats?.cache_hit_rate_percent ?? 0}%
                </Text>
                <Text style={styles.kpiSub}>Exact & Semantic Caching</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Avg Response Latency</Text>
                <Text style={styles.kpiValue}>{stats?.avg_response_time_ms ?? 0} ms</Text>
                <Text style={styles.kpiSub}>Fast statutory retrieval</Text>
              </View>

              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Citizen Feedback</Text>
                <Text style={styles.kpiValue}>
                  {stats?.total_feedback ?? 0} ({stats?.avg_rating ?? 5.0} ★)
                </Text>
                <Text style={styles.kpiSub}>Flagged count: {stats?.flagged_count ?? 0}</Text>
              </View>
            </View>

            {/* Flagged and Recent Feedback */}
            <View style={styles.tableCard}>
              <Text style={styles.sectionHeading}>🚩 Citizen Feedback & Flagged Responses</Text>
              {feedbackList.length === 0 ? (
                <Text style={styles.emptyText}>No feedback submitted yet.</Text>
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
                          <Text style={styles.flagText}>FLAGGED FOR AUDIT</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.fbComment}>
                      {item.comment || '(No written comment provided)'}
                    </Text>
                    <Text style={styles.fbDate}>{item.created_at}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Recent Queries & Cache Speed-up Log */}
            <View style={styles.tableCard}>
              <Text style={styles.sectionHeading}>⚡ Telemetry Log & Cache Speed-up</Text>
              {chatLogs.length === 0 ? (
                <Text style={styles.emptyText}>No query logs recorded yet.</Text>
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
                          {log.cached ? '⚡ CACHE HIT' : '🔄 RAG RUN'}
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
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 8,
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
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshText: {
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
  },
  kpiHighlight: {
    borderColor: Colors.gold,
    borderWidth: 1.5,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  feedbackItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  flaggedItem: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
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
    color: '#EAB308',
    fontSize: 13,
  },
  flagBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  flagText: {
    color: '#FFFFFF',
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
    borderBottomColor: '#F1F5F9',
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
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cachePillHit: {
    backgroundColor: '#FEF3C7',
  },
  cachePillMiss: {
    backgroundColor: '#F1F5F9',
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
