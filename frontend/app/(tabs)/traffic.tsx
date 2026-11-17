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
import { Colors } from '../../constants/Colors';
import { getUI } from '../../constants/Translations';
import { localizeApiError } from '../../constants/ApiErrors';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { GavelIcon } from '../../constants/Illustrations';
import { disputeTrafficFine, TrafficDisputeData } from '../../services/api';

export default function TrafficDisputeScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = getUI(language);

  // Wizard Form Fields
  const [challanNumber, setChallanNumber] = useState('');
  const [date, setDate] = useState('');
  const [place, setPlace] = useState('');
  const [vehicleType, setVehicleType] = useState(() => t.trVehicleDefault);
  const [violationCharged, setViolationCharged] = useState(() => t.trViolationDefault);
  const [sectionCharged, setSectionCharged] = useState('Section 194D');
  const [fineAmount, setFineAmount] = useState('');
  const [disputeReason, setDisputeReason] = useState('wrong_vehicle');
  const [customExplanation, setCustomExplanation] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrafficDisputeData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const disputeReasons = [
    { id: 'wrong_vehicle', label: t.trReason1 },
    { id: 'valid_documents', label: t.trReason2 },
    { id: 'signal_camera_fault', label: t.trReason3 },
    { id: 'wrong_section', label: t.trReason4 },
    { id: 'already_paid', label: t.trReason5 },
    { id: 'wrong_amount', label: t.trReason6 },
    { id: 'other', label: t.trReason7 },
  ];

  const handleSubmit = async () => {
    if (!challanNumber.trim()) {
      Alert.alert(t.requiredTitle, t.trRequiredMsg);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const data = await disputeTrafficFine({
        challan_number: challanNumber,
        date: date || 'Recent',
        place: place || 'City',
        vehicle_type: vehicleType,
        violation_charged: violationCharged,
        section_charged: sectionCharged,
        fine_amount: fineAmount || 'Verify on official portal',
        dispute_reason: disputeReason,
        custom_explanation: customExplanation,
        language: language,
      });
      setResult(data);
    } catch (err: any) {
      setErrorMessage(localizeApiError(err.message, language) || t.trFail);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 3000);
    } else {
      Alert.alert(t.trCopiedTitle, t.trCopiedMsg);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 3000);
    }
  };

  return (
    <View style={styles.container}>
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Wizard Form Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <GavelIcon size={32} color={Colors.gold} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.heading}>{t.trafficTitle}</Text>
              <Text style={styles.subHeading}>{t.trafficDesc}</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t.trChallanLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.trChallanPh}
              value={challanNumber}
              onChangeText={setChallanNumber}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>{t.trDateLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.cpDatePh}
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>{t.trPlaceLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.trPlacePh}
                value={place}
                onChangeText={setPlace}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t.trVehicleLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.trVehiclePh}
              value={vehicleType}
              onChangeText={setVehicleType}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1.2 }]}>
              <Text style={styles.inputLabel}>{t.trViolationLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.trViolationPh}
                value={violationCharged}
                onChangeText={setViolationCharged}
              />
            </View>
            <View style={[styles.formGroup, { flex: 0.8 }]}>
              <Text style={styles.inputLabel}>{t.trSectionLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.trSectionPh}
                value={sectionCharged}
                onChangeText={setSectionCharged}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t.trReasonLabel}</Text>
            <View style={styles.radioGrid}>
              {disputeReasons.map((r) => {
                const selected = disputeReason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.radioItem, selected && styles.radioItemSelected]}
                    onPress={() => setDisputeReason(r.id)}
                  >
                    <Text style={[styles.radioText, selected && styles.radioTextSelected]}>
                      {selected ? '● ' : '○ '}{r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t.trCustomLabel}</Text>
            <TextInput
              style={[styles.input, { minHeight: 65 }]}
              placeholder={t.trCustomPh}
              value={customExplanation}
              onChangeText={setCustomExplanation}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{t.trSubmit}</Text>
            )}
          </TouchableOpacity>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}
        </View>

        {/* Evaluation Output */}
        {result && (
          <View style={styles.resultCard}>
            {/* Section Matching Analysis */}
            <View
              style={[
                styles.analysisBox,
                result.section_matches ? styles.matchGood : styles.matchWarning,
              ]}
            >
              <Text style={styles.analysisTitle}>
                {result.section_matches ? t.trMatched : t.trDiscrepancy}
              </Text>
              <Text style={styles.analysisDesc}>{result.section_analysis}</Text>
            </View>

            {/* Legal Options */}
            <View style={styles.sectionWrap}>
              <Text style={styles.wrapHeading}>{t.trOptions}</Text>
              <View style={styles.optionsGrid}>
                {result.options.map((opt, i) => (
                  <View key={i} style={styles.optionCard}>
                    <Text style={styles.optName}>{opt.name}</Text>
                    <Text style={styles.optDesc}>{opt.description}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Bilingual Draft Contest Letter */}
            <View style={styles.sectionWrap}>
              <View style={styles.letterHeader}>
                <Text style={styles.wrapHeading}>{t.trLetter}</Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => copyToClipboard(result.draft_contest_letter_english, 'eng')}
                >
                  <Text style={styles.copyBtnText}>
                    {copiedKey === 'eng' ? t.trCopiedEng : t.trCopyEng}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.letterBox}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                  <Text style={styles.letterText}>{result.draft_contest_letter_english}</Text>
                </ScrollView>
              </View>

              {language !== 'en' && (
                <>
                  <View style={[styles.letterHeader, { marginTop: 12 }]}>
                    <Text style={styles.wrapHeading}>
                      {t.trTranslatedLetter} ({t.appName})
                    </Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() => copyToClipboard(result.draft_contest_letter_target_lang, 'target')}
                    >
                      <Text style={styles.copyBtnText}>
                        {copiedKey === 'target' ? t.trCopied : t.trCopyTranslated}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.letterBox}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                      <Text style={styles.letterText}>{result.draft_contest_letter_target_lang}</Text>
                    </ScrollView>
                  </View>
                </>
              )}
            </View>

            {/* Submission Steps */}
            <View style={styles.sectionWrap}>
              <Text style={styles.wrapHeading}>{t.trSteps}</Text>
              {result.submission_steps.map((step, idx) => (
                <Text key={idx} style={styles.stepText}>{step}</Text>
              ))}
              <View style={styles.portalBox}>
                <Text style={styles.portalNote}>
                  {t.trPortalNote}{result.official_portal_url}{t.trPortalNoteEnd}
                </Text>
              </View>
            </View>

            <View style={styles.disclaimerFoot}>
              <Text style={styles.disclaimerText}>⚖️ {result.disclaimer || t.disclaimer}</Text>
            </View>
          </View>
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
    marginBottom: 16,
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
  formGroup: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  radioGrid: {
    gap: 6,
    marginTop: 4,
  },
  radioItem: {
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  radioItemSelected: {
    backgroundColor: '#FFFDF7',
    borderColor: Colors.navy,
  },
  radioText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  radioTextSelected: {
    color: Colors.navy,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 0,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  submitBtnDisabled: {
    backgroundColor: '#A9A79F',
    borderColor: '#A9A79F',
  },
  submitBtnText: {
    color: '#FFFDF7',
    fontWeight: '800',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#FFE9E3',
    borderColor: '#FF3B00',
    borderWidth: 2,
    borderRadius: 0,
    padding: 10,
    marginTop: 10,
  },
  errorText: {
    color: '#C22A00',
    fontSize: 13,
  },
  resultCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 20,
    borderColor: Colors.gold,
    borderWidth: 3,
    ...Platform.select({
      web: { boxShadow: '5px 5px 0 #111111' },
      default: { elevation: 4 },
    }),
  },
  analysisBox: {
    borderRadius: 0,
    padding: 12,
    marginBottom: 16,
    borderWidth: 2,
  },
  matchGood: {
    backgroundColor: '#FFFDF7',
    borderColor: '#00A86B',
  },
  matchWarning: {
    backgroundColor: '#FFFDF7',
    borderColor: '#FDE047',
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 4,
  },
  analysisDesc: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  wrapHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 8,
  },
  optionsGrid: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    padding: 10,
  },
  optName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 2,
  },
  optDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  letterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  copyBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyBtnText: {
    color: '#FFFDF7',
    fontSize: 11,
    fontWeight: '700',
  },
  letterBox: {
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    padding: 12,
  },
  letterText: {
    fontSize: 12.5,
    color: Colors.textPrimary,
    lineHeight: 19,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  stepText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  portalBox: {
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 8,
    marginTop: 8,
  },
  portalNote: {
    fontSize: 11.5,
    color: Colors.navy,
    fontWeight: '600',
  },
  disclaimerFoot: {
    borderTopWidth: 1,
    borderTopColor: '#ECE7DC',
    paddingTop: 10,
    marginTop: 6,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
