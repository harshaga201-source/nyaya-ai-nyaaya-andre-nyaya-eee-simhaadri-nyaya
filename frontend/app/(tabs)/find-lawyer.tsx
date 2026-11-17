import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { getUI } from '../../constants/Translations';
import { localizeApiError } from '../../constants/ApiErrors';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { ScalesOfJustice } from '../../constants/Illustrations';
import { fetchLawyers, registerLawyer, requestConsultation, Lawyer } from '../../services/api';

export default function LawyersScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = getUI(language);

  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');

  // Request Consultation Modal State
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [issueSummary, setIssueSummary] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  // Register Lawyer Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regBarCouncil, setRegBarCouncil] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regState, setRegState] = useState('');
  const [regLanguages, setRegLanguages] = useState(() => t.lwRegLangDefault);
  const [regPracticeArea, setRegPracticeArea] = useState(() => t.lwRegPracticeDefault);
  const [regExperience, setRegExperience] = useState('5');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const loadLawyers = async () => {
    setLoading(true);
    try {
      const data = await fetchLawyers({
        city: cityFilter,
        language: langFilter,
        practice_area: areaFilter,
      });
      setLawyers(data);
    } catch (e: any) {
      console.warn('Could not fetch lawyers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLawyers();
  }, [cityFilter, langFilter, areaFilter]);

  const handleRequestSubmit = async () => {
    if (!userName.trim() || !userPhone.trim()) {
      Alert.alert(t.requiredFields, t.lwRequiredMsg);
      return;
    }
    if (!consentGiven) {
      Alert.alert(t.consentRequired, t.lwConsentMsg);
      return;
    }

    setRequestLoading(true);
    try {
      const res = await requestConsultation({
        lawyer_id: selectedLawyer?.id,
        user_name: userName,
        user_phone: userPhone,
        user_email: userEmail,
        issue_summary: issueSummary,
        consent_given: consentGiven,
      });
      setSelectedLawyer(null);
      setUserName('');
      setUserPhone('');
      setUserEmail('');
      setIssueSummary('');
      setConsentGiven(false);
      setNotification(t.lwSent);
    } catch (e: any) {
      Alert.alert(t.errorTitle, localizeApiError(e.message, language) || t.lwFail);
    } finally {
      setRequestLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    if (!regName.trim() || !regBarCouncil.trim() || !regPhone.trim()) {
      Alert.alert(t.requiredFields, t.lwRegRequiredMsg);
      return;
    }

    setRegLoading(true);
    try {
      const langs = regLanguages.split(',').map((s) => s.trim()).filter(Boolean);
      await registerLawyer({
        name: regName,
        bar_council_no: regBarCouncil,
        city: regCity,
        state: regState,
        languages: langs,
        practice_area: regPracticeArea,
        years_experience: parseInt(regExperience, 10) || 1,
        phone: regPhone,
        email: regEmail,
      });
      setShowRegisterModal(false);
      setRegName('');
      setRegBarCouncil('');
      setRegCity('');
      setRegPhone('');
      setRegEmail('');
      setNotification(t.lwRegistered);
      loadLawyers();
    } catch (e: any) {
      Alert.alert(t.errorTitle, localizeApiError(e.message, language) || t.lwRegFail);
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ScalesOfJustice size={32} color={Colors.gold} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.heading}>{t.lawyerTitle}</Text>
              <Text style={styles.subHeading}>{t.lawyerDesc}</Text>
            </View>
            <TouchableOpacity
              style={styles.registerTopBtn}
              onPress={() => setShowRegisterModal(true)}
            >
              <Text style={styles.registerTopText}>{t.lwRegisterBtn}</Text>
            </TouchableOpacity>
          </View>

          {/* Sample Data Disclaimer Badge */}
          <View style={styles.sampleBadge}>
            <Text style={styles.sampleBadgeText}>{t.lwSampleNotice}</Text>
          </View>

          {/* Filters Row */}
          <View style={styles.filterRow}>
            <TextInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder={t.lwFilterCity}
              value={cityFilter}
              onChangeText={setCityFilter}
            />
            <TextInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder={t.lwFilterArea}
              value={areaFilter}
              onChangeText={setAreaFilter}
            />
          </View>

          {notification && (
            <View style={styles.notificationBox}>
              <Text style={styles.notificationText}>{notification}</Text>
            </View>
          )}
        </View>

        {/* Lawyers Directory List */}
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={Colors.gold} />
          </View>
        ) : (
          <View style={styles.lawyersList}>
            {lawyers.map((lawyer) => (
              <View key={lawyer.id} style={styles.lawyerCard}>
                <View style={styles.lawyerHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lawyerName}>{lawyer.name}</Text>
                    <Text style={styles.lawyerCity}>📍 {lawyer.city}, {lawyer.state}</Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>
                      {lawyer.status === 'verified' ? t.lwVerified : t.lwPending}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t.lwPracticeArea}</Text>
                  <Text style={styles.detailValue}>{lawyer.practice_area}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t.lwExperience}</Text>
                  <Text style={styles.detailValue}>{lawyer.years_experience} {t.lwYears}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t.lwBarCouncil}</Text>
                  <Text style={styles.detailValue}>{lawyer.bar_council_no}</Text>
                </View>

                <View style={styles.languagesWrap}>
                  {lawyer.languages.map((l, i) => (
                    <View key={i} style={styles.langPill}>
                      <Text style={styles.langPillText}>{l}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.lawyerCardFoot}>
                  <Text style={styles.sampleTag}>{t.lwSampleTag}</Text>
                  <TouchableOpacity
                    style={styles.requestBtn}
                    onPress={() => setSelectedLawyer(lawyer)}
                  >
                    <Text style={styles.requestBtnText}>{t.lwRequestHelp}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Consultation Request Modal */}
        <Modal
          visible={!!selectedLawyer}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedLawyer(null)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>{t.lwModalTitle}</Text>
                <TouchableOpacity onPress={() => setSelectedLawyer(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.advocateTag}>
                {t.lwConsulting}{selectedLawyer?.name} ({selectedLawyer?.practice_area})
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder={t.lwNamePh}
                value={userName}
                onChangeText={setUserName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder={t.lwPhonePh}
                value={userPhone}
                onChangeText={setUserPhone}
              />
              <TextInput
                style={styles.modalInput}
                placeholder={t.lwEmailPh}
                value={userEmail}
                onChangeText={setUserEmail}
              />
              <TextInput
                style={[styles.modalInput, { minHeight: 70 }]}
                placeholder={t.lwIssuePh}
                value={issueSummary}
                onChangeText={setIssueSummary}
                multiline
              />

              {/* Mandatory Consent Checkbox */}
              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setConsentGiven(!consentGiven)}
              >
                <Text style={styles.checkboxText}>{consentGiven ? '☑' : '☐'}</Text>
                <Text style={styles.consentLabel}>{t.lwConsent}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  (!consentGiven || requestLoading) && styles.disabledBtn,
                ]}
                onPress={handleRequestSubmit}
                disabled={!consentGiven || requestLoading}
              >
                {requestLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>{t.lwSubmitRequest}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Register Lawyer Modal */}
        <Modal
          visible={showRegisterModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRegisterModal(false)}
        >
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>{t.lwRegisterTitle}</Text>
                <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }}>
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegNamePh}
                  value={regName}
                  onChangeText={setRegName}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegBarPh}
                  value={regBarCouncil}
                  onChangeText={setRegBarCouncil}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegCityPh}
                  value={regCity}
                  onChangeText={setRegCity}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegStatePh}
                  value={regState}
                  onChangeText={setRegState}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegPracticePh}
                  value={regPracticeArea}
                  onChangeText={setRegPracticeArea}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegLangPh}
                  value={regLanguages}
                  onChangeText={setRegLanguages}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegExpPh}
                  value={regExperience}
                  onChangeText={setRegExperience}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegPhonePh}
                  value={regPhone}
                  onChangeText={setRegPhone}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegEmailPh}
                  value={regEmail}
                  onChangeText={setRegEmail}
                />
              </ScrollView>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, regLoading && styles.disabledBtn]}
                onPress={handleRegisterSubmit}
                disabled={regLoading}
              >
                {regLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>{t.lwSubmitRegistration}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  registerTopBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  registerTopText: {
    color: Colors.navyDark,
    fontSize: 11,
    fontWeight: '800',
  },
  sampleBadge: {
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 8,
    marginBottom: 12,
  },
  sampleBadgeText: {
    fontSize: 11.5,
    color: Colors.navy,
    fontWeight: '600',
    lineHeight: 16,
  },
  filterRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 8,
  },
  filterInput: {
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  notificationBox: {
    backgroundColor: '#E6F6EC',
    borderColor: '#00A86B',
    borderWidth: 2,
    borderRadius: 0,
    padding: 10,
    marginTop: 10,
  },
  notificationText: {
    color: '#00704A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  lawyersList: {
    gap: 12,
  },
  lawyerCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 16,
    borderColor: Colors.cardBorder,
    borderWidth: 2,
  },
  lawyerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lawyerName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
  },
  lawyerCity: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#FFFDF7',
    borderColor: '#E6F6EC',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    color: '#00704A',
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    width: 120,
  },
  detailValue: {
    fontSize: 12.5,
    color: Colors.textPrimary,
    flex: 1,
  },
  languagesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginVertical: 8,
  },
  langPill: {
    backgroundColor: '#ECE7DC',
    borderRadius: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  langPillText: {
    fontSize: 11,
    color: Colors.navy,
    fontWeight: '600',
  },
  lawyerCardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ECE7DC',
    paddingTop: 8,
    marginTop: 6,
  },
  sampleTag: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  requestBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  requestBtnText: {
    color: '#FFFDF7',
    fontSize: 12,
    fontWeight: '700',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 20,
    width: '100%',
    maxWidth: 440,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
  },
  closeBtn: {
    fontSize: 18,
    color: Colors.textMuted,
    padding: 4,
  },
  advocateTag: {
    fontSize: 12.5,
    color: Colors.goldDark,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  checkboxText: {
    fontSize: 18,
    marginRight: 8,
    color: Colors.navy,
  },
  consentLabel: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 16,
    flex: 1,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  disabledBtn: {
    backgroundColor: '#A9A79F',
  },
  modalSubmitText: {
    color: '#FFFDF7',
    fontSize: 13,
    fontWeight: '800',
  },
});
