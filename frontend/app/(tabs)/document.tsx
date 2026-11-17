import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
import { getUI } from '../../constants/Translations';
import { localizeApiError } from '../../constants/ApiErrors';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { LawBooks } from '../../constants/Illustrations';
import { analyzeDocumentFile, DocumentAnalysisData } from '../../services/api';

export default function DocumentReaderScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = getUI(language);

  const [loading, setLoading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pick Document (PDF)
  const handlePickDocument = async () => {
    setErrorMessage(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFileName(file.name);
        
        let filePayload: any = {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/pdf',
        };

        if (Platform.OS === 'web' && (file as any).file) {
          filePayload.blob = (file as any).file;
        }

        await processDocument(filePayload);
      }
    } catch (e: any) {
      setErrorMessage(t.docLoadError + localizeApiError(e.message, language));
    }
  };

  // Pick or Capture Photo
  const handlePickImage = async (fromCamera: boolean = false) => {
    setErrorMessage(null);
    try {
      let result;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(t.docPermTitle, t.docPermMsg);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `document_${Date.now()}.jpg`;
        setSelectedFileName(fileName);

        let filePayload: any = {
          uri: asset.uri,
          name: fileName,
          type: asset.mimeType || 'image/jpeg',
        };

        if (Platform.OS === 'web') {
          // fetch blob on web
          const res = await fetch(asset.uri);
          filePayload.blob = await res.blob();
        }

        await processDocument(filePayload);
      }
    } catch (e: any) {
      setErrorMessage(t.docImageError + localizeApiError(e.message, language));
    }
  };

  const processDocument = async (fileData: any) => {
    setLoading(true);
    setAnalysisResult(null);
    try {
      const data = await analyzeDocumentFile(fileData, language);
      setAnalysisResult(data);
    } catch (err: any) {
      setErrorMessage(localizeApiError(err.message, language) || t.docAnalysisFail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Intro Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LawBooks size={32} color={Colors.gold} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.heading}>{t.docReaderTitle}</Text>
              <Text style={styles.subHeading}>{t.docReaderDesc}</Text>
            </View>
          </View>

          <View style={styles.privacyCallout}>
            <Text style={styles.privacyText}>{t.docPrivacy}</Text>
          </View>

          {/* Upload Buttons */}
          <View style={styles.uploadRow}>
            <TouchableOpacity style={styles.uploadBtn} onPress={handlePickDocument}>
              <Text style={styles.uploadIcon}>📄</Text>
              <Text style={styles.uploadText}>{t.docSelectPdf}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadBtn} onPress={() => handlePickImage(false)}>
              <Text style={styles.uploadIcon}>🖼️</Text>
              <Text style={styles.uploadText}>{t.docUploadPhoto}</Text>
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <TouchableOpacity style={styles.uploadBtn} onPress={() => handlePickImage(true)}>
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>{t.docTakePhoto}</Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedFileName && (
            <View style={styles.selectedFileBox}>
              <Text style={styles.selectedLabel}>{t.docActive} </Text>
              <Text style={styles.selectedName} numberOfLines={1}>{selectedFileName}</Text>
            </View>
          )}

          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.gold} />
              <Text style={styles.loadingText}>{t.docAnalyzing}</Text>
            </View>
          )}

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}
        </View>

        {/* Structured Results Display */}
        {analysisResult && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.docTypeBadge}>📑 {analysisResult.document_type}</Text>
            </View>

            {/* Parties */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{t.docParties}</Text>
              {analysisResult.parties.map((party, idx) => (
                <Text key={idx} style={styles.bulletItem}>• {party}</Text>
              ))}
            </View>

            {/* Key Dates & Amounts */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{t.docDates}</Text>
              {analysisResult.key_dates_and_amounts.map((item, idx) => (
                <Text key={idx} style={styles.bulletItem}>• {item}</Text>
              ))}
            </View>

            {/* Sections Cited */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{t.docSections}</Text>
              <View style={styles.chipRow}>
                {analysisResult.sections_cited.map((sec, idx) => (
                  <View key={idx} style={styles.secChip}>
                    <Text style={styles.secChipText}>{sec}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Plain Words Meaning */}
            <View style={styles.highlightBlock}>
              <Text style={styles.sectionTitleGold}>{t.docPlain}</Text>
              <Text style={styles.plainText}>{analysisResult.plain_meaning}</Text>
            </View>

            {/* Action Items & Deadlines */}
            <View style={styles.actionBlock}>
              <Text style={styles.sectionTitleDanger}>{t.docNext}</Text>
              {analysisResult.action_items_and_deadlines.map((action, idx) => (
                <Text key={idx} style={styles.actionItem}>✓ {action}</Text>
              ))}
            </View>

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>⚖️ {analysisResult.disclaimer || t.disclaimer}</Text>
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
  privacyCallout: {
    backgroundColor: '#FFFDF7',
    borderColor: '#E6F6EC',
    borderWidth: 2,
    borderRadius: 0,
    padding: 10,
    marginBottom: 16,
  },
  privacyText: {
    fontSize: 12,
    color: '#00704A',
    lineHeight: 16,
    fontWeight: '600',
  },
  uploadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  uploadBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 3,
    borderStyle: 'dashed',
    borderRadius: 0,
    padding: 14,
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 8,
    marginTop: 6,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  selectedName: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.goldDark,
    fontWeight: '600',
    textAlign: 'center',
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
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DC',
    paddingBottom: 10,
  },
  docTypeBadge: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 6,
  },
  bulletItem: {
    fontSize: 13.5,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginLeft: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  secChip: {
    backgroundColor: '#ECE7DC',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  secChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  highlightBlock: {
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitleGold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 6,
  },
  plainText: {
    fontSize: 14,
    color: '#111111',
    lineHeight: 21,
  },
  actionBlock: {
    backgroundColor: '#FFFDF7',
    borderColor: '#E6F6EC',
    borderWidth: 2,
    borderRadius: 0,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitleDanger: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00704A',
    marginBottom: 6,
  },
  actionItem: {
    fontSize: 13.5,
    color: '#00704A',
    lineHeight: 20,
    marginBottom: 4,
    fontWeight: '500',
  },
  disclaimerBox: {
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
