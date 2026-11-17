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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors } from '../../constants/Colors';
import { getUI } from '../../constants/Translations';
import { localizeApiError } from '../../constants/ApiErrors';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { CourthousePillars } from '../../constants/Illustrations';
import { draftComplaint, ComplaintDraftData } from '../../services/api';

export default function ComplaintScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = getUI(language);

  const [complaintType, setComplaintType] = useState('police_fir');
  const [complainantName, setComplainantName] = useState('');
  const [complainantContact, setComplainantContact] = useState('');
  const [complainantAddress, setComplainantAddress] = useState('');
  const [oppositeParty, setOppositeParty] = useState('');
  const [dateOfIncident, setDateOfIncident] = useState('');
  const [placeOfIncident, setPlaceOfIncident] = useState('');
  const [incidentDetails, setIncidentDetails] = useState('');
  const [reliefSought, setReliefSought] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComplaintDraftData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const complaintTypes = [
    { id: 'police_fir', label: t.cpType1, icon: '👮' },
    { id: 'consumer_dispute', label: t.cpType2, icon: '🛍️' },
    { id: 'cyber_crime', label: t.cpType3, icon: '💻' },
    { id: 'rti_application', label: t.cpType4, icon: '📋' },
  ];

  const handleGenerate = async () => {
    if (!complainantName.trim() || !incidentDetails.trim()) {
      Alert.alert(t.requiredFields, t.cpRequiredMsg);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const data = await draftComplaint({
        complaint_type: complaintType,
        complainant_name: complainantName,
        complainant_contact: complainantContact || '[Contact Number]',
        complainant_address: complainantAddress || '[Full Residential Address]',
        opposite_party: oppositeParty || '[Opposite Party / Accused Person / Department]',
        date_of_incident: dateOfIncident || '[Date / Period]',
        place_of_incident: placeOfIncident || '[City / Place]',
        incident_details: incidentDetails,
        relief_sought: reliefSought || 'Immediate registration, statutory action, and appropriate relief.',
        language: language,
      });
      setResult(data);
    } catch (e: any) {
      setErrorMessage(localizeApiError(e.message, language) || t.cpFail);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!result) return;

    if (Platform.OS === 'web') {
      window.print();
      return;
    }

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${result.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            h1 { font-size: 18px; color: #111111; text-align: center; text-transform: uppercase; border-bottom: 2px solid #FFD400; padding-bottom: 10px; }
            .warning { background-color: #FFD400; border: 1px solid #F59E0B; padding: 10px; border-radius: 6px; font-weight: bold; margin-bottom: 20px; font-size: 12px; color: #92400E; text-align: center; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.8; }
            .footer { margin-top: 40px; font-size: 11px; color: #3F3D38; border-top: 1px solid #ECE7DC; padding-top: 10px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="warning">⚠️ ${result.banner_warning}</div>
          <h1>${result.title}</h1>
          <pre>${result.formatted_draft}</pre>
          <div class="footer">${t.cpFooter}</div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert(t.pdfGenerated, `${t.savedAt}${uri}`);
      }
    } catch (err: any) {
      Alert.alert(t.cpPdfTitle, localizeApiError(err.message, language) || t.cpPdfError);
    }
  };

  return (
    <View style={styles.container}>
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Step-by-Step Generator Form */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CourthousePillars size={32} color={Colors.gold} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.heading}>{t.complaintTitle}</Text>
              <Text style={styles.subHeading}>{t.complaintDesc}</Text>
            </View>
          </View>

          {/* Warning Banner Required by Spec */}
          <View style={styles.bannerWarning}>
            <Text style={styles.bannerWarningText}>{t.cpBanner}</Text>
          </View>

          {/* Select Type */}
          <Text style={styles.inputLabel}>{t.cpCategory}</Text>
          <View style={styles.typeSelectorRow}>
            {complaintTypes.map((type) => {
              const selected = complaintType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeButton, selected && styles.typeButtonSelected]}
                  onPress={() => setComplaintType(type.id)}
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                  <Text style={[styles.typeText, selected && styles.typeTextSelected]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Guided Inputs */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t.cpNameLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.cpNamePh}
              value={complainantName}
              onChangeText={setComplainantName}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>{t.cpPhoneLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98XXXXXXXX"
                value={complainantContact}
                onChangeText={setComplainantContact}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>{t.cpDateLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.cpDatePh}
                value={dateOfIncident}
                onChangeText={setDateOfIncident}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t.cpAddressLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.cpAddressPh}
              value={complainantAddress}
              onChangeText={setComplainantAddress}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t.cpOppositeLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.cpOppositePh}
              value={oppositeParty}
              onChangeText={setOppositeParty}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t.cpPlaceLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.cpPlacePh}
              value={placeOfIncident}
              onChangeText={setPlaceOfIncident}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t.cpDetailsLabel}</Text>
            <TextInput
              style={[styles.input, { minHeight: 90 }]}
              placeholder={t.cpDetailsPh}
              value={incidentDetails}
              onChangeText={setIncidentDetails}
              multiline
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t.cpReliefLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.cpReliefPh}
              value={reliefSought}
              onChangeText={setReliefSought}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{t.cpSubmit}</Text>
            )}
          </TouchableOpacity>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}
        </View>

        {/* Generated Complaint Output */}
        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>{result.title}</Text>
              <TouchableOpacity style={styles.pdfBtn} onPress={handleExportPDF}>
                <Text style={styles.pdfBtnText}>{t.cpExport}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.authorityRow}>
              <Text style={styles.authorityLabel}>{t.cpTarget}</Text>
              <Text style={styles.authorityValue}>{result.target_authority}</Text>
            </View>

            <View style={styles.sectionsRow}>
              <Text style={styles.sectionsLabel}>{t.cpProvisions}</Text>
              <View style={styles.chipsWrap}>
                {result.sections_cited.map((s, i) => (
                  <View key={i} style={styles.chip}>
                    <Text style={styles.chipTxt}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.draftBox}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 340 }}>
                <Text style={styles.draftText}>{result.formatted_draft}</Text>
              </ScrollView>
            </View>

            <View style={styles.footDisclaimer}>
              <Text style={styles.footText}>⚖️ {result.disclaimer}</Text>
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
    marginBottom: 12,
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
  bannerWarning: {
    backgroundColor: '#FFD400',
    borderColor: '#F59E0B',
    borderWidth: 3,
    borderRadius: 0,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  bannerWarningText: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 13,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexGrow: 1,
  },
  typeButtonSelected: {
    backgroundColor: '#FFFDF7',
    borderColor: Colors.navy,
    borderWidth: 3,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  typeText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  typeTextSelected: {
    color: Colors.navy,
    fontWeight: '800',
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
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DC',
    paddingBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
    flex: 1,
  },
  pdfBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pdfBtnText: {
    color: Colors.navyDark,
    fontSize: 12,
    fontWeight: '800',
  },
  authorityRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  authorityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  authorityValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  sectionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
    marginRight: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  chip: {
    backgroundColor: '#ECE7DC',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.navy,
  },
  draftBox: {
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    padding: 14,
  },
  draftText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footDisclaimer: {
    borderTopWidth: 1,
    borderTopColor: '#ECE7DC',
    paddingTop: 10,
    marginTop: 10,
  },
  footText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
