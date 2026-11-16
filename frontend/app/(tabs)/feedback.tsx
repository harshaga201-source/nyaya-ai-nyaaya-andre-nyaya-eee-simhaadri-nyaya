import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { TRANSLATIONS } from '../../constants/Translations';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { LawBooks } from '../../constants/Illustrations';
import { submitFeedback } from '../../services/api';

export default function FeedbackScreen() {
  const router = useRouter();
  const { language, setLanguage } = useContext(LanguageContext);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState('accuracy');
  const [comment, setComment] = useState('');
  const [isFlagged, setIsFlagged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    { id: 'accuracy', label: 'Citation Accuracy' },
    { id: 'translation', label: 'Language & Translation' },
    { id: 'traffic', label: 'Traffic Dispute Tool' },
    { id: 'complaint', label: 'Complaint Generator' },
    { id: 'speed', label: 'Response Speed & Cache' },
    { id: 'other', label: 'General Experience' },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await submitFeedback({
        rating,
        category,
        comment,
        is_flagged: isFlagged || rating <= 2,
      });
      setSubmitted(true);
      setComment('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LawBooks size={32} color={Colors.gold} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.heading}>Citizen Feedback & Quality Control</Text>
              <Text style={styles.subHeading}>
                Your feedback directly improves statutory accuracy and verifies legal citations.
              </Text>
            </View>
          </View>

          {submitted ? (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successTitle}>Thank You for Your Feedback!</Text>
              <Text style={styles.successDesc}>
                Your submission has been recorded in the SQLite database and helps refine NyayaSathi's legal AI precision.
              </Text>
              <TouchableOpacity
                style={styles.anotherBtn}
                onPress={() => setSubmitted(false)}
              >
                <Text style={styles.anotherBtnText}>Submit Another Response</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Star Rating */}
              <Text style={styles.inputLabel}>1. Rate Your Experience (1 to 5 Stars):</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={styles.starBtn}
                    onPress={() => setRating(star)}
                  >
                    <Text style={[styles.starEmoji, star <= rating && styles.starActive]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.ratingLabel}>{rating} / 5 Stars</Text>
              </View>

              {/* Category */}
              <Text style={styles.inputLabel}>2. Select Category:</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const selected = category === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catBtn, selected && styles.catBtnSelected]}
                      onPress={() => setCategory(cat.id)}
                    >
                      <Text style={[styles.catText, selected && styles.catTextSelected]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Comments */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>3. Comments, Suggestions or Cited Discrepancy:</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Share details regarding citation quality, usability, or legal questions you'd like added..."
                  placeholderTextColor="#94A3B8"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                />
              </View>

              {/* Flag Discrepancy Checkbox */}
              <TouchableOpacity
                style={styles.flagRow}
                onPress={() => setIsFlagged(!isFlagged)}
              >
                <Text style={styles.checkboxText}>{isFlagged ? '☑' : '☐'}</Text>
                <Text style={styles.flagLabel}>
                  Flag an inaccurate citation or section for administrator audit.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Feedback →</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Quick Admin Dashboard Link */}
          <View style={styles.adminFooter}>
            <Text style={styles.adminNote}>Administrator & Telemetry View:</Text>
            <TouchableOpacity
              style={styles.adminNavBtn}
              onPress={() => router.push('/admin')}
            >
              <Text style={styles.adminNavText}>Open Admin Dashboard (Stats, Cache & Flags) →</Text>
            </TouchableOpacity>
          </View>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' },
      default: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
  },
  subHeading: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 6,
    marginTop: 10,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  starBtn: {
    padding: 4,
  },
  starEmoji: {
    fontSize: 32,
    color: '#CBD5E1',
  },
  starActive: {
    color: '#EAB308',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    marginLeft: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  catBtn: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  catBtnSelected: {
    backgroundColor: '#EEF2F6',
    borderColor: Colors.navy,
    borderWidth: 1.5,
  },
  catText: {
    fontSize: 12.5,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  catTextSelected: {
    color: Colors.navy,
    fontWeight: '800',
  },
  formGroup: {
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkboxText: {
    fontSize: 18,
    color: Colors.navy,
    marginRight: 8,
  },
  flagLabel: {
    fontSize: 12.5,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },
  submitBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 6,
  },
  successDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 400,
    marginBottom: 16,
    lineHeight: 18,
  },
  anotherBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  anotherBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  adminFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  adminNote: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  adminNavBtn: {
    backgroundColor: '#EEF2F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adminNavText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
});
