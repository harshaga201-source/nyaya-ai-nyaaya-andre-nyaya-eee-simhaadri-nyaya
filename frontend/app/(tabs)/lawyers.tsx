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
import { TRANSLATIONS } from '../../constants/Translations';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { ScalesOfJustice } from '../../constants/Illustrations';
import { fetchLawyers, registerLawyer, requestConsultation, Lawyer } from '../../services/api';

export default function LawyersScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

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
  const [regLanguages, setRegLanguages] = useState('English, Hindi');
  const [regPracticeArea, setRegPracticeArea] = useState('Criminal Law & Bail');
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
      Alert.alert('Required Fields', 'Please enter your name and phone number.');
      return;
    }
    if (!consentGiven) {
      Alert.alert('Consent Required', 'Please check the consent box to proceed.');
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
      setNotification('✅ Consultation request sent! The advocate will contact you within 24-48 hours.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Request failed.');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    if (!regName.trim() || !regBarCouncil.trim() || !regPhone.trim()) {
      Alert.alert('Required Fields', 'Please fill name, Bar Council number, and phone.');
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
      setNotification('✅ Registration submitted! Profile saved under "pending verification".');
      loadLawyers();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Registration failed.');
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
              <Text style={styles.registerTopText}>+ Register as Lawyer</Text>
            </TouchableOpacity>
          </View>

          {/* Sample Data Disclaimer Badge */}
          <View style={styles.sampleBadge}>
            <Text style={styles.sampleBadgeText}>
              ℹ️ Notice: Profiles below are designated SAMPLE DATA for demonstration purposes. Free legal aid is accessible via Tele-Law (14454).
            </Text>
          </View>

          {/* Filters Row */}
          <View style={styles.filterRow}>
            <TextInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder="Filter by City (e.g. Delhi, Bengaluru)..."
              value={cityFilter}
              onChangeText={setCityFilter}
            />
            <TextInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder="Filter by Practice Area..."
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
                      {lawyer.status === 'verified' ? '✓ Verified' : '⏳ Pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Practice Area:</Text>
                  <Text style={styles.detailValue}>{lawyer.practice_area}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Experience:</Text>
                  <Text style={styles.detailValue}>{lawyer.years_experience} Years</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bar Council Reg:</Text>
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
                  <Text style={styles.sampleTag}>[Sample Data]</Text>
                  <TouchableOpacity
                    style={styles.requestBtn}
                    onPress={() => setSelectedLawyer(lawyer)}
                  >
                    <Text style={styles.requestBtnText}>Request Help →</Text>
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
                <Text style={styles.modalTitle}>Request Legal Consultation</Text>
                <TouchableOpacity onPress={() => setSelectedLawyer(null)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.advocateTag}>
                Consulting: {selectedLawyer?.name} ({selectedLawyer?.practice_area})
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Your Full Name *"
                value={userName}
                onChangeText={setUserName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Phone Number / Mobile *"
                value={userPhone}
                onChangeText={setUserPhone}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Email Address (Optional)"
                value={userEmail}
                onChangeText={setUserEmail}
              />
              <TextInput
                style={[styles.modalInput, { minHeight: 70 }]}
                placeholder="Brief summary of your legal query / issue *"
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
                <Text style={styles.consentLabel}>
                  I consent to sharing my contact details and query summary with this advocate for legal assistance.
                </Text>
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
                  <Text style={styles.modalSubmitText}>Submit Consultation Request</Text>
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
                <Text style={styles.modalTitle}>Register as an Advocate</Text>
                <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Full Legal Name *"
                  value={regName}
                  onChangeText={setRegName}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="State Bar Council Number (e.g. D/1234/2015) *"
                  value={regBarCouncil}
                  onChangeText={setRegBarCouncil}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="City / Jurisdiction *"
                  value={regCity}
                  onChangeText={setRegCity}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="State *"
                  value={regState}
                  onChangeText={setRegState}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Practice Areas (e.g. Criminal, Consumer, Traffic)"
                  value={regPracticeArea}
                  onChangeText={setRegPracticeArea}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Languages Spoken (comma separated)"
                  value={regLanguages}
                  onChangeText={setRegLanguages}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Years of Active Experience"
                  value={regExperience}
                  onChangeText={setRegExperience}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Phone Number *"
                  value={regPhone}
                  onChangeText={setRegPhone}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Official Email *"
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
                  <Text style={styles.modalSubmitText}>Submit Registration (Pending Verification)</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
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
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  registerTopText: {
    color: Colors.navyDark,
    fontSize: 11,
    fontWeight: '800',
  },
  sampleBadge: {
    backgroundColor: '#EEF2F6',
    borderRadius: 8,
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
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  notificationBox: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  notificationText: {
    color: '#166534',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
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
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    color: '#15803D',
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
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
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
    borderTopColor: '#F1F5F9',
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  requestBtnText: {
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
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
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
