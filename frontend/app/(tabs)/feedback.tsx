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
import { getUI } from '../../constants/Translations';
import { localizeApiError } from '../../constants/ApiErrors';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { LawBooks } from '../../constants/Illustrations';
import { submitFeedback } from '../../services/api';

export default function FeedbackScreen() {
  const router = useRouter();
  const { language, setLanguage } = useContext(LanguageContext);
  const t = getUI(language);

  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState('accuracy');
  const [comment, setComment] = useState('');
  const [isFlagged, setIsFlagged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    { id: 'accuracy', label: t.fbCat1 },
    { id: 'translation', label: t.fbCat2 },
    { id: 'traffic', label: t.fbCat3 },
    { id: 'complaint', label: t.fbCat4 },
    { id: 'speed', label: t.fbCat5 },
    { id: 'other', label: t.fbCat6 },
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
      Alert.alert(t.errorTitle, localizeApiError(err.message, language) || t.fbFail);
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
              <Text style={styles.heading}>{t.fbTitle}</Text>
              <Text style={styles.subHeading}>{t.fbDesc}</Text>
            </View>
          </View>

          {submitted ? (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successTitle}>{t.fbThanks}</Text>
              <Text style={styles.successDesc}>{t.fbThanksDesc}</Text>
              <TouchableOpacity
                style={styles.anotherBtn}
                onPress={() => setSubmitted(false)}
              >
                <Text style={styles.anotherBtnText}>{t.fbAnother}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Star Rating */}
              <Text style={styles.inputLabel}>{t.fbRate}</Text>
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
                <Text style={styles.ratingLabel}>{rating}{t.fbStars}</Text>
              </View>

              {/* Category */}
              <Text style={styles.inputLabel}>{t.fbCategory}</Text>
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
                <Text style={styles.inputLabel}>{t.fbComments}</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder={t.fbCommentsPh}
                  placeholderTextColor="#A9A79F"
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
                <Text style={styles.flagLabel}>{t.fbFlag}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>{t.fbSubmit}</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Quick Admin Dashboard Link */}
          <View style={styles.adminFooter}>
            <Text style={styles.adminNote}>{t.fbAdminNote}</Text>
            <TouchableOpacity
              style={styles.adminNavBtn}
              onPress={() => router.push('/admin')}
            >
              <Text style={styles.adminNavText}>{t.fbAdminBtn}</Text>
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
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 20,
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
    color: '#111111',
  },
  starActive: {
    color: '#FFD400',
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
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  catBtnSelected: {
    backgroundColor: '#FFFDF7',
    borderColor: Colors.navy,
    borderWidth: 3,
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
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
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
    color: '#C22A00',
    fontWeight: '600',
    flex: 1,
  },
  submitBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  submitBtnDisabled: {
    backgroundColor: '#A9A79F',
  },
  submitBtnText: {
    color: '#FFFDF7',
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
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  anotherBtnText: {
    color: '#FFFDF7',
    fontWeight: '700',
    fontSize: 13,
  },
  adminFooter: {
    borderTopWidth: 1,
    borderTopColor: '#ECE7DC',
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
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adminNavText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
});
