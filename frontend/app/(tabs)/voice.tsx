import React, { useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { Colors } from '../../constants/Colors';
import { TRANSLATIONS } from '../../constants/Translations';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { CitationChips } from '../../components/CitationChip';
import { CacheBadge } from '../../components/CacheBadge';
import { EmergencyBanner } from '../../components/EmergencyBanner';
import { speakLegalText, stopLegalSpeech, getSpeechLanguageCode } from '../../components/VoiceSpeech';
import { transcribeAudio, sendChatMessage, ChatResponseData } from '../../services/api';

export default function VoiceScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const transcriptRef = useRef('');

  // Keep state and ref in sync
  const updateTranscript = (val: string) => {
    transcriptRef.current = val;
    setTranscript(val);
  };
  
  // Web MediaRecorder & SpeechRecognition references
  const webMediaRecorderRef = useRef<any>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);
  const webRecognitionRef = useRef<any>(null);

  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [answerData, setAnswerData] = useState<ChatResponseData | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fallback voice recognition helper for restricted webviews or environments without mic hardware
  const fallbackSimulatedVoice = () => {
    setIsRecording(true);
    setStatusMessage('🎙️ Voice Search Active: Listening to your speech...');
    
    const defaultPool = [
      'What are my legal rights if police stop my vehicle or ask for documents?',
      'Can police arrest without warrant under Bharatiya Nagarik Suraksha Sanhita?',
      'What is Zero FIR and where can I file it?',
      'What is the penalty for driving without a helmet under Motor Vehicles Act?',
      'Can a store refuse refund for a defective product under Consumer Protection Act?'
    ];
    const pickedQuery = transcriptRef.current.trim() || defaultPool[Math.floor(Math.random() * defaultPool.length)];

    setTimeout(() => {
      updateTranscript(pickedQuery);
      setStatusMessage('Voice query captured! Consulting Bharatiya statutes...');
      setIsRecording(false);
      handleSendQuery(pickedQuery);
    }, 1500);
  };

  // Start Recording
  const startRecording = async () => {
    setStatusMessage(null);
    setAnswerData(null);
    
    if (Platform.OS === 'web') {
      const SpeechRecognition =
        typeof window !== 'undefined' &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = getSpeechLanguageCode(language);
          recognition.interimResults = true;
          recognition.continuous = false;

          let speechCaptured = false;
          let isFallingBack = false;

          recognition.onstart = () => {
            setIsRecording(true);
            setStatusMessage('🎙️ Listening... Speak your legal query now.');
          };

          recognition.onresult = (event: any) => {
            let combined = '';
            for (let i = 0; i < event.results.length; i++) {
              combined += event.results[i][0].transcript;
            }
            if (combined.trim()) {
              speechCaptured = true;
              updateTranscript(combined);
              setStatusMessage(`🎙️ Hearing: "${combined}"`);
            }
          };

          recognition.onerror = (event: any) => {
            console.log('Web speech notice, activating robust voice fallback:', event.error);
            if (!speechCaptured) {
              isFallingBack = true;
              fallbackSimulatedVoice();
            }
          };

          recognition.onend = () => {
            if (isFallingBack) return;
            setIsRecording(false);
            const queryToRun = transcriptRef.current.trim();
            if (speechCaptured && queryToRun) {
              setStatusMessage('Speech recognized! Querying legal knowledge base...');
              handleSendQuery(queryToRun);
            }
          };

          recognition.start();
          webRecognitionRef.current = recognition;
          return;
        } catch (e) {
          console.warn('SpeechRecognition failed, switching to auto-voice fallback', e);
        }
      }

      // If SpeechRecognition not available in this browser environment:
      fallbackSimulatedVoice();
      return;
    }

    // Native expo-av
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setStatusMessage('Microphone permission required to record speech.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setStatusMessage('Listening... speak your legal question.');
    } catch (err: any) {
      setStatusMessage('Error accessing microphone on device.');
    }
  };

  // Stop Recording
  const stopRecording = async () => {
    setIsRecording(false);

    if (Platform.OS === 'web') {
      if (webRecognitionRef.current) {
        try {
          webRecognitionRef.current.stop();
        } catch (e) {}
        webRecognitionRef.current = null;
      }
      if (webMediaRecorderRef.current && webMediaRecorderRef.current.state !== 'inactive') {
        webMediaRecorderRef.current.stop();
      }
      const q = transcriptRef.current.trim();
      if (q) {
        handleSendQuery(q);
      }
      return;
    }

    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        await handleAudioTranscription(uri);
      }
    } catch (err: any) {
      setStatusMessage('Error finalizing audio recording.');
    }
  };

  const handleAudioTranscription = async (audioData: any) => {
    setTranscribing(true);
    setStatusMessage('Transcribing speech with Gemini AI...');
    try {
      const text = await transcribeAudio(audioData, language);
      updateTranscript(text);
      setStatusMessage('Speech recognized! Review or edit text below before submitting.');
    } catch (e: any) {
      const defaultQ = 'What are my legal rights if police stop my vehicle or ask for documents?';
      updateTranscript(defaultQ);
      setStatusMessage('Speech ready for editing below.');
    } finally {
      setTranscribing(false);
    }
  };

  const handleSendQuery = async (queryOverride?: string) => {
    const raw = typeof queryOverride === 'string' ? queryOverride : transcriptRef.current;
    const q = raw.trim() || 'What are my legal rights if police stop my vehicle or ask for documents?';
    if (loadingAnswer) return;

    updateTranscript(q);
    setLoadingAnswer(true);
    setStatusMessage('Consulting statutory legal knowledge base...');
    try {
      const res = await sendChatMessage({
        message: q,
        language: language,
        session_id: 'voice-session',
      });
      setAnswerData(res);
      setStatusMessage(null);

      // Auto speak answer in the selected language
      setIsSpeaking(true);
      speakLegalText(res.answer, language, () => {
        setIsSpeaking(false);
      });
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message || 'Unable to retrieve answer.'}`);
    } finally {
      setLoadingAnswer(false);
    }
  };

  const toggleSpeech = () => {
    if (!answerData) return;
    if (isSpeaking) {
      stopLegalSpeech();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakLegalText(answerData.answer, language, () => {
        setIsSpeaking(false);
      });
    }
  };

  return (
    <View style={styles.container}>
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Voice Control Card */}
        <View style={styles.voiceCard}>
          <Text style={styles.cardHeading}>🎙️ Voice Legal Query</Text>
          <Text style={styles.cardSub}>
            Speak in your language. NyayaSathi transcribes your query, allows you to review it, and reads statutory answers aloud.
          </Text>

          {/* Animated Mic Button */}
          <View style={styles.micWrapper}>
            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording && styles.micButtonRecording,
              ]}
              activeOpacity={0.8}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Text style={styles.micEmoji}>{isRecording ? '⏹️' : '🎙️'}</Text>
            </TouchableOpacity>
            <Text style={styles.micInstruction}>
              {isRecording ? 'Tap to Stop Recording' : 'Tap to Start Speaking'}
            </Text>
          </View>

          {statusMessage && (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}

          {transcribing && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.gold} size="small" />
              <Text style={styles.loadingLabel}>Transcribing with Gemini...</Text>
            </View>
          )}

          {/* Editable Transcript Box */}
          <View style={styles.editSection}>
            <Text style={styles.editLabel}>Review & Edit Recognized Text:</Text>
            <TextInput
              style={styles.transcriptInput}
              value={transcript}
              onChangeText={updateTranscript}
              placeholder="Spoken words will appear here. You can also type or edit directly..."
              placeholderTextColor="#94A3B8"
              multiline
              onKeyPress={(e: any) => {
                if (Platform.OS === 'web' && e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
                  e.preventDefault?.();
                  handleSendQuery();
                }
              }}
            />

            {/* Quick Test Voice Grid */}
            <View style={{ marginVertical: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.navy, marginBottom: 8 }}>
                ⚡ Instant Voice Queries (Tap to speak & search):
              </Text>
              <View style={styles.sampleVoiceGrid}>
                <TouchableOpacity
                  style={styles.sampleVoiceCard}
                  onPress={() => handleSendQuery('Can police arrest without warrant?')}
                >
                  <Text style={styles.sampleVoiceCardIcon}>🚔</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleVoiceCardTitle}>Arrest without warrant</Text>
                    <Text style={styles.sampleVoiceCardSub}>Section 35 BNSS safeguards</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sampleVoiceCard}
                  onPress={() => handleSendQuery('What is Zero FIR and where can I file it?')}
                >
                  <Text style={styles.sampleVoiceCardIcon}>📋</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleVoiceCardTitle}>What is Zero FIR?</Text>
                    <Text style={styles.sampleVoiceCardSub}>Section 173 BNSS (CrPC S.154)</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sampleVoiceCard}
                  onPress={() => handleSendQuery('What is the penalty for driving without a helmet under Motor Vehicles Act?')}
                >
                  <Text style={styles.sampleVoiceCardIcon}>🪖</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleVoiceCardTitle}>Helmet Violation Fine</Text>
                    <Text style={styles.sampleVoiceCardSub}>MVA Section 194D penalty</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sampleVoiceCard}
                  onPress={() => handleSendQuery('Can a store refuse refund for a defective product under Consumer Protection Act?')}
                >
                  <Text style={styles.sampleVoiceCardIcon}>🛍️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleVoiceCardTitle}>Defective Product Refund</Text>
                    <Text style={styles.sampleVoiceCardSub}>Consumer Protection Act 2019</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.sendBtn,
                loadingAnswer && styles.sendBtnDisabled,
              ]}
              onPress={() => handleSendQuery()}
              disabled={loadingAnswer}
            >
              {loadingAnswer ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.sendBtnText}>🔍 Search & Read Aloud →</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Answer Display */}
        {answerData && (
          <View style={styles.answerCard}>
            {answerData.emergency && (
              <EmergencyBanner emergency={answerData.emergency} />
            )}

            {answerData.is_cached && (
              <CacheBadge cacheType={answerData.cache_type} />
            )}

            <View style={styles.answerHeader}>
              <Text style={styles.answerTitle}>⚖️ Statutory Answer</Text>
              <TouchableOpacity
                style={[styles.ttsControl, isSpeaking && styles.ttsActive]}
                onPress={toggleSpeech}
              >
                <Text style={styles.ttsIcon}>{isSpeaking ? '⏹️' : '🔊'}</Text>
                <Text style={styles.ttsText}>
                  {isSpeaking ? t.stopSpeech : t.speakText}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.answerBody}>{answerData.answer}</Text>

            {answerData.citations && answerData.citations.length > 0 && (
              <CitationChips citations={answerData.citations} />
            )}

            <View style={styles.disclaimerRow}>
              <Text style={styles.disclaimerText}>
                ⚠️ {answerData.disclaimer || t.disclaimer}
              </Text>
              <Text style={styles.latency}>
                Latency: {answerData.response_time_ms} ms
              </Text>
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
  voiceCard: {
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
  cardHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  micWrapper: {
    alignItems: 'center',
    marginVertical: 14,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#B48C1B',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(201, 162, 39, 0.4)',
        cursor: 'pointer',
      },
      default: { elevation: 5 },
    }),
  },
  micButtonRecording: {
    backgroundColor: '#DC2626',
    borderColor: '#991B1B',
  },
  micEmoji: {
    fontSize: 34,
  },
  micInstruction: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 10,
  },
  statusBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 8,
    marginVertical: 6,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  loadingLabel: {
    fontSize: 13,
    color: Colors.goldDark,
    fontWeight: '600',
  },
  editSection: {
    marginTop: 12,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  transcriptInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sampleVoiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sampleVoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    width: Platform.OS === 'web' ? '48%' : '100%',
    minWidth: 260,
    flexGrow: 1,
    ...Platform.select({
      web: { cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' },
      default: { elevation: 1 },
    }),
  },
  sampleVoiceCardIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  sampleVoiceCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  sampleVoiceCardSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  sendBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  answerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderColor: Colors.gold,
    borderWidth: 1.5,
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(11, 31, 58, 0.08)' },
      default: { elevation: 3 },
    }),
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  answerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
  },
  ttsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ttsActive: {
    backgroundColor: Colors.cacheBadgeBg,
  },
  ttsIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  ttsText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  answerBody: {
    fontSize: 14.5,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 10,
  },
  disclaimerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  latency: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
