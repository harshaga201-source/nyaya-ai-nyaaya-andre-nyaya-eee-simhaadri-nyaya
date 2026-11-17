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
import { getLawyerUi, formatLawyerUi } from '../../constants/LawyerUi';
import { localizeApiError } from '../../constants/ApiErrors';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { ScalesOfJustice } from '../../constants/Illustrations';
import {
  fetchLawyers,
  fetchLawyerLocations,
  registerLawyer,
  requestConsultation,
  Lawyer,
  LawyerLocationSuggestion,
} from '../../services/api';

const LANGUAGE_FILTERS = [
  'English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi',
  'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'Odia', 'Assamese', 'Marwari',
  'Bhojpuri', 'Haryanvi', 'Garhwali',
];

const isValidIndianPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits);
};

const isValidEmail = (value: string) =>
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value.trim());

const isValidBarNumber = (value: string) =>
  /^[A-Za-z]{1,4}\/\d{1,6}\/\d{4}$/.test(value.replace(/\s+/g, ''));

export default function LawyersScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = getUI(language);
  const ui = getLawyerUi(language);

  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [locationFilter, setLocationFilter] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [suggestions, setSuggestions] = useState<LawyerLocationSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
  const [regArea, setRegArea] = useState('');
  const [regPincode, setRegPincode] = useState('');
  const [regCourt, setRegCourt] = useState('');
  const [regLanguages, setRegLanguages] = useState(() => t.lwRegLangDefault);
  const [regPracticeArea, setRegPracticeArea] = useState(() => t.lwRegPracticeDefault);
  const [regExperience, setRegExperience] = useState('5');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchLawyers({
          location: locationFilter,
          language: langFilter,
          practice_area: areaFilter,
        });
        if (active) setLawyers(data);
      } catch (e: any) {
        if (active) {
          setLawyers([]);
          setLoadError(ui.loadError);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [locationFilter, langFilter, areaFilter, refreshKey, ui.loadError]);

  useEffect(() => {
    if (!showSuggestions) return;
    let active = true;
    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const data = await fetchLawyerLocations(locationFilter, 8);
        if (active) setSuggestions(data);
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSuggestionsLoading(false);
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [locationFilter, showSuggestions]);

  const clearFilters = () => {
    setLocationFilter('');
    setAreaFilter('');
    setLangFilter('');
    setShowSuggestions(false);
  };

  const hasActiveFilters = Boolean(locationFilter.trim() || areaFilter.trim() || langFilter);

  const handleRequestSubmit = async () => {
    if (!userName.trim() || !userPhone.trim()) {
      Alert.alert(t.requiredFields, t.lwRequiredMsg);
      return;
    }
    if (!isValidIndianPhone(userPhone)) {
      Alert.alert(t.errorTitle, ui.invalidPhone);
      return;
    }
    if (userEmail.trim() && !isValidEmail(userEmail)) {
      Alert.alert(t.errorTitle, ui.invalidEmail);
      return;
    }
    if (issueSummary.trim().length < 10) {
      Alert.alert(t.requiredFields, t.lwIssuePh);
      return;
    }
    if (!consentGiven) {
      Alert.alert(t.consentRequired, t.lwConsentMsg);
      return;
    }

    setRequestLoading(true);
    try {
      await requestConsultation({
        lawyer_id: selectedLawyer?.id,
        user_name: userName.trim(),
        user_phone: userPhone.trim(),
        user_email: userEmail.trim(),
        issue_summary: issueSummary.trim(),
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

  const resetRegistration = () => {
    setRegName('');
    setRegBarCouncil('');
    setRegCity('');
    setRegState('');
    setRegArea('');
    setRegPincode('');
    setRegCourt('');
    setRegLanguages(t.lwRegLangDefault);
    setRegPracticeArea(t.lwRegPracticeDefault);
    setRegExperience('5');
    setRegPhone('');
    setRegEmail('');
  };

  const handleRegisterSubmit = async () => {
    const barNumber = regBarCouncil.replace(/\s+/g, '').toUpperCase();
    if (!regName.trim() || !barNumber || !regCity.trim() || !regState.trim() || !regArea.trim() || !regPhone.trim() || !regEmail.trim()) {
      Alert.alert(t.requiredFields, t.lwRegRequiredMsg);
      return;
    }
    if (!isValidBarNumber(barNumber)) {
      Alert.alert(t.errorTitle, ui.invalidBar);
      return;
    }
    if (regPincode.trim() && !/^\d{6}$/.test(regPincode.trim())) {
      Alert.alert(t.errorTitle, ui.regPincodePh);
      return;
    }
    if (!isValidIndianPhone(regPhone)) {
      Alert.alert(t.errorTitle, ui.invalidPhone);
      return;
    }
    if (!isValidEmail(regEmail)) {
      Alert.alert(t.errorTitle, ui.invalidEmail);
      return;
    }
    const experience = parseInt(regExperience, 10);
    if (!Number.isFinite(experience) || experience < 0 || experience > 60) {
      Alert.alert(t.errorTitle, ui.invalidExperience);
      return;
    }
    const langs = regLanguages.split(',').map((s) => s.trim()).filter(Boolean);
    if (!langs.length) {
      Alert.alert(t.requiredFields, t.lwRegLangPh);
      return;
    }

    setRegLoading(true);
    try {
      await registerLawyer({
        name: regName.trim(),
        bar_council_no: barNumber,
        city: regCity.trim(),
        state: regState.trim(),
        area: regArea.trim(),
        pincode: regPincode.trim(),
        court: regCourt.trim(),
        languages: langs,
        practice_area: regPracticeArea.trim(),
        years_experience: experience,
        phone: regPhone.trim(),
        email: regEmail.trim(),
      });
      setShowRegisterModal(false);
      resetRegistration();
      setNotification(t.lwRegistered);
      setRefreshKey((value) => value + 1);
    } catch (e: any) {
      Alert.alert(t.errorTitle, localizeApiError(e.message, language) || t.lwRegFail);
    } finally {
      setRegLoading(false);
    }
  };

  const showingCount = formatLawyerUi(ui.showingCount, { n: lawyers.length });
  const showingFor = formatLawyerUi(ui.showingFor, { q: locationFilter.trim() });

  return (
    <View style={styles.container}>
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner and filters */}
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

          <View style={styles.sampleBadge}>
            <Text style={styles.sampleBadgeText}>{t.lwSampleNotice}</Text>
          </View>

          {/* Location autocomplete */}
          <Text style={styles.fieldLabel}>{ui.locationHint}</Text>
          <View style={styles.locationInputWrap}>
            <TextInput
              style={styles.locationInput}
              placeholder={ui.filterLocation}
              placeholderTextColor={Colors.textMuted}
              value={locationFilter}
              onChangeText={(value) => {
                setLocationFilter(value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
              returnKeyType="search"
              autoCapitalize="words"
            />
            {locationFilter ? (
              <TouchableOpacity
                style={styles.clearInputBtn}
                onPress={() => {
                  setLocationFilter('');
                  setShowSuggestions(true);
                }}
              >
                <Text style={styles.clearInputText}>✕</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.searchGlyph}>⌕</Text>
            )}
          </View>

          {showSuggestions && (
            <View style={styles.suggestionsBox}>
              <Text style={styles.suggestionsTitle}>{ui.suggestionsLabel}</Text>
              {suggestionsLoading ? (
                <ActivityIndicator size="small" color={Colors.gold} style={{ paddingVertical: 8 }} />
              ) : suggestions.length ? (
                suggestions.map((item) => (
                  <TouchableOpacity
                    key={`${item.type}-${item.value}`}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setLocationFilter(item.value);
                      setShowSuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>📍 {item.label}</Text>
                    <Text style={styles.suggestionMeta}>{item.type.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noSuggestionText}>{ui.locationHint}</Text>
              )}
            </View>
          )}

          <View style={styles.filterRow}>
            <TextInput
              style={[styles.filterInput, { flex: 1 }]}
              placeholder={ui.filterPractice}
              placeholderTextColor={Colors.textMuted}
              value={areaFilter}
              onChangeText={setAreaFilter}
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{ui.filterLanguage}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <TouchableOpacity
              style={[styles.chip, !langFilter && styles.chipActive]}
              onPress={() => setLangFilter('')}
            >
              <Text style={[styles.chipText, !langFilter && styles.chipTextActive]}>{ui.allLanguages}</Text>
            </TouchableOpacity>
            {LANGUAGE_FILTERS.map((item) => {
              const active = langFilter === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setLangFilter(active ? '' : item)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.filterHint}>{ui.locationHint}</Text>

          {hasActiveFilters && (
            <View style={styles.activeFilterRow}>
              {locationFilter.trim() ? (
                <Text style={styles.activeFilterChip}>📍 {locationFilter.trim()}</Text>
              ) : null}
              {areaFilter.trim() ? (
                <Text style={styles.activeFilterChip}>⚖ {areaFilter.trim()}</Text>
              ) : null}
              {langFilter ? (
                <Text style={styles.activeFilterChip}>🗣 {langFilter}</Text>
              ) : null}
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearInline}>{ui.clearFilters}</Text>
              </TouchableOpacity>
            </View>
          )}

          {notification && (
            <View style={styles.notificationBox}>
              <Text style={styles.notificationText}>{notification}</Text>
              <TouchableOpacity onPress={() => setNotification(null)}>
                <Text style={styles.notificationClose}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {loadError && (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => setRefreshKey((value) => value + 1)}
            >
              <Text style={styles.retryBtnText}>{ui.retry}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results summary */}
        {!loadError && !loading && lawyers.length > 0 && (
          <View style={styles.resultBar}>
            <Text style={styles.resultText}>{showingCount}</Text>
            {locationFilter.trim() ? <Text style={styles.resultLocation}>{showingFor}</Text> : null}
          </View>
        )}
        {!loadError && loading && lawyers.length > 0 && (
          <View style={styles.updatingRow}>
            <ActivityIndicator size="small" color={Colors.gold} />
            <Text style={styles.updatingText}>{ui.locationHint}</Text>
          </View>
        )}

        {/* Lawyers Directory List */}
        {loading && lawyers.length === 0 ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={Colors.gold} />
          </View>
        ) : !loadError && lawyers.length === 0 ? (
          <View style={[styles.card, styles.emptyState]}>
            <Text style={styles.emptyIcon}>⚖️</Text>
            <Text style={styles.emptyTitle}>{ui.noResultsTitle}</Text>
            <Text style={styles.emptyBody}>{ui.noResultsBody}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={clearFilters}>
              <Text style={styles.retryBtnText}>{ui.clearFilters}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.lawyersList}>
            {lawyers.map((lawyer) => (
              <View key={lawyer.id} style={styles.lawyerCard}>
                <View style={styles.lawyerHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lawyerName}>{lawyer.name}</Text>
                    <Text style={styles.lawyerPractice}>{lawyer.practice_area}</Text>
                    <Text style={styles.lawyerCity}>
                      📍 {lawyer.area || lawyer.city}, {lawyer.city}, {lawyer.state}
                      {lawyer.pincode ? ` — ${lawyer.pincode}` : ''}
                    </Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>
                      {lawyer.status === 'verified' ? t.lwVerified : t.lwPending}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{ui.court}:</Text>
                  <Text style={styles.detailValue}>{lawyer.court || '—'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{ui.chamber}:</Text>
                  <Text style={styles.detailValue}>{lawyer.address || `${lawyer.area}, ${lawyer.city}`}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t.lwExperience}</Text>
                  <Text style={styles.detailValue}>{lawyer.years_experience} {t.lwYears}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t.lwBarCouncil}</Text>
                  <Text style={styles.detailValue}>{lawyer.bar_council_no}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{ui.contact}:</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactValue} selectable>{lawyer.phone || '—'}</Text>
                    <Text style={styles.contactValue} selectable>{lawyer.email || '—'}</Text>
                  </View>
                </View>

                <View style={styles.languagesWrap}>
                  {lawyer.languages.map((l, i) => (
                    <View key={i} style={styles.langPill}>
                      <Text style={styles.langPillText}>{l}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.lawyerCardFoot}>
                  <Text style={styles.sampleTag}>{ui.demoProfile}</Text>
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
              {selectedLawyer ? (
                <Text style={styles.advocateLocation}>
                  {selectedLawyer.area}, {selectedLawyer.city}, {selectedLawyer.state} ·{' '}
                  {selectedLawyer.court}
                </Text>
              ) : null}

              <ScrollView style={{ maxHeight: 380 }}>
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwNamePh}
                  placeholderTextColor={Colors.textMuted}
                  value={userName}
                  onChangeText={setUserName}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwPhonePh}
                  placeholderTextColor={Colors.textMuted}
                  value={userPhone}
                  onChangeText={setUserPhone}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwEmailPh}
                  placeholderTextColor={Colors.textMuted}
                  value={userEmail}
                  onChangeText={setUserEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.modalInput, { minHeight: 70 }]}
                  placeholder={t.lwIssuePh}
                  placeholderTextColor={Colors.textMuted}
                  value={issueSummary}
                  onChangeText={setIssueSummary}
                  multiline
                />

                <TouchableOpacity
                  style={styles.consentRow}
                  onPress={() => setConsentGiven(!consentGiven)}
                >
                  <Text style={styles.checkboxText}>{consentGiven ? '☑' : '☐'}</Text>
                  <Text style={styles.consentLabel}>{t.lwConsent}</Text>
                </TouchableOpacity>
              </ScrollView>

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

              <ScrollView style={{ maxHeight: 430 }}>
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegNamePh}
                  placeholderTextColor={Colors.textMuted}
                  value={regName}
                  onChangeText={setRegName}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegBarPh}
                  placeholderTextColor={Colors.textMuted}
                  value={regBarCouncil}
                  onChangeText={setRegBarCouncil}
                  autoCapitalize="characters"
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegCityPh}
                  placeholderTextColor={Colors.textMuted}
                  value={regCity}
                  onChangeText={setRegCity}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegStatePh}
                  placeholderTextColor={Colors.textMuted}
                  value={regState}
                  onChangeText={setRegState}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={ui.regAreaPh}
                  placeholderTextColor={Colors.textMuted}
                  value={regArea}
                  onChangeText={setRegArea}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={ui.regPincodePh}
                  placeholderTextColor={Colors.textMuted}
                  value={regPincode}
                  onChangeText={setRegPincode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={ui.regCourtPh}
                  placeholderTextColor={Colors.textMuted}
                  value={regCourt}
                  onChangeText={setRegCourt}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegPracticePh}
                  placeholderTextColor={Colors.textMuted}
                  value={regPracticeArea}
                  onChangeText={setRegPracticeArea}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegLangPh}
                  placeholderTextColor={Colors.textMuted}
                  value={regLanguages}
                  onChangeText={setRegLanguages}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegExpPh}
                  placeholderTextColor={Colors.textMuted}
                  value={regExperience}
                  onChangeText={setRegExperience}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegPhonePh}
                  placeholderTextColor={Colors.textMuted}
                  value={regPhone}
                  onChangeText={setRegPhone}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder={t.lwRegEmailPh}
                  placeholderTextColor={Colors.textMuted}
                  value={regEmail}
                  onChangeText={setRegEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
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
  fieldLabel: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 16,
  },
  locationInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 10,
  },
  locationInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  clearInputBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  clearInputText: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  searchGlyph: {
    fontSize: 18,
    color: Colors.navy,
    fontWeight: '700',
  },
  suggestionsBox: {
    borderColor: Colors.cardBorder,
    borderWidth: 2,
    borderTopWidth: 0,
    backgroundColor: '#FFFDF7',
    paddingVertical: 4,
  },
  suggestionsTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#ECE7DC',
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.navy,
    fontWeight: '600',
    flex: 1,
  },
  suggestionMeta: {
    fontSize: 9.5,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  noSuggestionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    lineHeight: 17,
  },
  filterRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 8,
    marginTop: 10,
  },
  filterInput: {
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 2,
  },
  chip: {
    borderColor: Colors.cardBorder,
    borderWidth: 1.5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: '#FFFDF7',
  },
  chipActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.navy,
  },
  chipTextActive: {
    color: '#FFFDF7',
  },
  filterHint: {
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 8,
    lineHeight: 15,
  },
  activeFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ECE7DC',
  },
  activeFilterChip: {
    backgroundColor: '#ECE7DC',
    color: Colors.navy,
    fontSize: 10.5,
    fontWeight: '700',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  clearInline: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.goldDark,
    textDecorationLine: 'underline',
    marginLeft: 2,
  },
  notificationBox: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
    lineHeight: 17,
  },
  notificationClose: {
    color: '#00704A',
    fontSize: 15,
    fontWeight: '800',
    paddingLeft: 8,
  },
  errorCard: {
    borderColor: '#B42318',
  },
  errorText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 10,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: '#FFFDF7',
    fontSize: 12,
    fontWeight: '800',
  },
  resultBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
    gap: 4,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.navy,
  },
  resultLocation: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  updatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  updatingText: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 520,
    marginBottom: 14,
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
    gap: 8,
  },
  lawyerName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
  },
  lawyerPractice: {
    fontSize: 12,
    color: Colors.goldDark,
    fontWeight: '700',
    marginTop: 2,
    lineHeight: 16,
  },
  lawyerCity: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  statusPill: {
    backgroundColor: '#E6F6EC',
    borderColor: '#00A86B',
    borderWidth: 1.5,
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    color: '#00704A',
    fontSize: 10.5,
    fontWeight: '800',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    width: 118,
  },
  detailValue: {
    fontSize: 12.5,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 17,
  },
  contactValue: {
    fontSize: 12.5,
    color: Colors.navy,
    fontWeight: '600',
    lineHeight: 18,
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
    gap: 8,
  },
  sampleTag: {
    fontSize: 10.5,
    color: Colors.textMuted,
    fontStyle: 'italic',
    flex: 1,
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
    maxWidth: 460,
    maxHeight: '92%',
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
    marginBottom: 4,
    lineHeight: 18,
  },
  advocateLocation: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
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
    color: Colors.textPrimary,
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
