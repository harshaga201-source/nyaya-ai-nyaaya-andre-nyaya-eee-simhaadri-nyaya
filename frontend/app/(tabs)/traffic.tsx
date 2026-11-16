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
import { TRANSLATIONS } from '../../constants/Translations';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { GavelIcon } from '../../constants/Illustrations';
import { disputeTrafficFine, TrafficDisputeData } from '../../services/api';

export default function TrafficDisputeScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Wizard Form Fields
  const [challanNumber, setChallanNumber] = useState('');
  const [date, setDate] = useState('');
  const [place, setPlace] = useState('');
  const [vehicleType, setVehicleType] = useState('Two-Wheeler (Motorcycle/Scooter)');
  const [violationCharged, setViolationCharged] = useState('Driving without helmet');
  const [sectionCharged, setSectionCharged] = useState('Section 194D');
  const [fineAmount, setFineAmount] = useState('');
  const [disputeReason, setDisputeReason] = useState('wrong_vehicle');
  const [customExplanation, setCustomExplanation] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrafficDisputeData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const disputeReasons = [
    { id: 'wrong_vehicle', label: 'Wrong Vehicle / Registration Error' },
    { id: 'valid_documents', label: 'Valid Documents in DigiLocker/mParivahan' },
    { id: 'signal_camera_fault', label: 'Camera / Sensor Glitch / Yellow Light' },
    { id: 'wrong_section', label: 'Wrong Statutory Section Charged' },
    { id: 'already_paid', label: 'Challan Already Paid / Duplicate' },
    { id: 'wrong_amount', label: 'Discrepancy in Fine Amount' },
    { id: 'other', label: 'Other Factual Grounds' },
  ];

  const handleSubmit = async () => {
    if (!challanNumber.trim()) {
      Alert.alert('Required Field', 'Please enter your Challan Number or Notice ID.');
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
      setErrorMessage(err.message || 'Failed to analyze traffic challan.');
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
      Alert.alert('Contest Letter Copied', 'The letter text has been copied to your clipboard.');
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
            <Text style={styles.inputLabel}>Challan Number / Notice Reference *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. DL12345678901234"
              value={challanNumber}
              onChangeText={setChallanNumber}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Date of Alleged Violation</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Location / Place</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MG Road Junction"
                value={place}
                onChangeText={setPlace}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Vehicle Type</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Two-Wheeler / Car / Commercial"
              value={vehicleType}
              onChangeText={setVehicleType}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1.2 }]}>
              <Text style={styles.inputLabel}>Alleged Violation</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Exceeding speed limit"
                value={violationCharged}
                onChangeText={setViolationCharged}
              />
            </View>
            <View style={[styles.formGroup, { flex: 0.8 }]}>
              <Text style={styles.inputLabel}>Section Charged</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Section 183"
                value={sectionCharged}
                onChangeText={setSectionCharged}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Reason for Contestation</Text>
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
            <Text style={styles.inputLabel}>Custom Facts & Explanations (Optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 65 }]}
              placeholder="Describe what occurred (e.g. camera took photo of another car, or PUC was valid in DigiLocker)..."
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
              <Text style={styles.submitBtnText}>Evaluate Dispute & Generate Letter →</Text>
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
                {result.section_matches ? '✅ Statutory Provision Matched' : '⚠️ Section Discrepancy Found'}
              </Text>
              <Text style={styles.analysisDesc}>{result.section_analysis}</Text>
            </View>

            {/* Legal Options */}
            <View style={styles.sectionWrap}>
              <Text style={styles.wrapHeading}>⚖️ Citizen Options to Contest</Text>
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
                <Text style={styles.wrapHeading}>📝 Ready-to-Submit Contest Letter</Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => copyToClipboard(result.draft_contest_letter_english, 'eng')}
                >
                  <Text style={styles.copyBtnText}>
                    {copiedKey === 'eng' ? '✓ Copied English' : '📋 Copy English'}
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
                      🌐 Translated Letter ({t.appName})
                    </Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() => copyToClipboard(result.draft_contest_letter_target_lang, 'target')}
                    >
                      <Text style={styles.copyBtnText}>
                        {copiedKey === 'target' ? '✓ Copied' : '📋 Copy Translated'}
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
              <Text style={styles.wrapHeading}>🚀 Steps to Submit on Official Portal</Text>
              {result.submission_steps.map((step, idx) => (
                <Text key={idx} style={styles.stepText}>{step}</Text>
              ))}
              <View style={styles.portalBox}>
                <Text style={styles.portalNote}>
                  Official Government Portal: {result.official_portal_url} (NyayaSathi will NEVER submit to or access government portals on your behalf).
                </Text>
              </View>
            </View>

            <View style={styles.disclaimerFoot}>
              <Text style={styles.disclaimerText}>⚖️ {result.disclaimer}</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    marginBottom: 16,
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
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
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
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  radioItemSelected: {
    backgroundColor: '#EEF2F6',
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
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderColor: Colors.gold,
    borderWidth: 1.5,
    ...Platform.select({
      web: { boxShadow: '0 6px 18px rgba(11, 31, 58, 0.08)' },
      default: { elevation: 3 },
    }),
  },
  analysisBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  matchGood: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  matchWarning: {
    backgroundColor: '#FEFCE8',
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
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
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
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  letterBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
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
    backgroundColor: '#EEF2F6',
    borderRadius: 8,
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
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 6,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
