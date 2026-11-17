import React, { useState, useContext, useRef, useEffect } from 'react';
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
import { Colors, BORDER, BORDER_THIN } from '../../constants/Colors';
import { getUI } from '../../constants/Translations';
import { localizeApiError } from '../../constants/ApiErrors';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { CitationChips } from '../../components/CitationChip';
import { CacheBadge } from '../../components/CacheBadge';
import { EmergencyBanner } from '../../components/EmergencyBanner';
import { speakLegalText, stopLegalSpeech, getSpeechLanguageCode } from '../../components/VoiceSpeech';
import { transcribeAudio, sendChatMessage, ChatResponseData } from '../../services/api';

export default function VoiceScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = getUI(language);

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
  const webStreamRef = useRef<any>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);
  const webRecognitionRef = useRef<any>(null);
  const captureModeRef = useRef<'recognition' | 'recorder' | null>(null);

  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [answerData, setAnswerData] = useState<ChatResponseData | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Stop any active web capture when leaving the screen.
  useEffect(() => {
    return () => {
      try {
        webRecognitionRef.current?.stop?.();
      } catch (e) {}
      webRecognitionRef.current = null;

      try {
        if (webMediaRecorderRef.current && webMediaRecorderRef.current.state !== 'inactive') {
          webMediaRecorderRef.current.stop();
        }
      } catch (e) {}
      webMediaRecorderRef.current = null;

      try {
        webStreamRef.current?.getTracks().forEach((track: any) => track.stop());
      } catch (e) {}
      webStreamRef.current = null;

      stopLegalSpeech();
    };
  }, []);

  const setSpeechError = (code?: string) => {
    const messages: Record<string, string> = {
      'not-allowed': t.stPermissionDenied,
      'service-not-allowed': t.stServiceNotAllowed,
      'no-speech': t.stNoSpeech,
      'audio-capture': t.stAudioCapture,
      network: t.stNetwork,
      aborted: t.stAborted,
    };
    setStatusMessage(messages[code || ''] || t.stVoiceIncomplete);
  };

  // Start Recording
  const startRecording = async () => {
    if (isRecording) return;
    setStatusMessage(null);
    setAnswerData(null);

    if (Platform.OS === 'web') {
      // Preferred path: the browser's own speech recognizer gives real speech-to-text
      // without needing a Gemini key. It fills the review box and never auto-sends.
      const SpeechRecognition =
        typeof window !== 'undefined' &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = getSpeechLanguageCode(language);
          recognition.interimResults = true;
          recognition.continuous = false;
          let errored = false;

          recognition.onstart = () => {
            setIsRecording(true);
            setStatusMessage(t.stListening);
          };

          recognition.onresult = (event: any) => {
            let combined = '';
            for (let i = 0; i < event.results.length; i++) {
              combined += event.results[i][0].transcript;
            }
            if (combined.trim()) {
              updateTranscript(combined.trim());
              setStatusMessage(t.stHearingPrefix + combined.trim());
            }
          };

          recognition.onerror = (event: any) => {
            console.log('Web speech error:', event.error);
            errored = true;
            captureModeRef.current = null;
            setIsRecording(false);
            setSpeechError(event.error);
          };

          recognition.onend = () => {
            captureModeRef.current = null;
            setIsRecording(false);
            webRecognitionRef.current = null;
            if (errored) return;
            if (transcriptRef.current.trim()) {
              setStatusMessage(t.stCaptured);
            } else {
              setStatusMessage(t.stNoSpeechDetected);
            }
          };

          recognition.start();
          webRecognitionRef.current = recognition;
          captureModeRef.current = 'recognition';
          return;
        } catch (e) {
          console.warn('SpeechRecognition could not start:', e);
          setStatusMessage(t.stRecStartFail);
          return;
        }
      }

      // Secondary path: record audio and send it to the backend /transcribe endpoint.
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
          setStatusMessage(t.stUnsupported);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        webStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        webAudioChunksRef.current = [];

        recorder.ondataavailable = (event: any) => {
          if (event.data && event.data.size > 0) {
            webAudioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const chunks = webAudioChunksRef.current;
          webAudioChunksRef.current = [];
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });

          try {
            webStreamRef.current?.getTracks().forEach((track: any) => track.stop());
          } catch (e) {}
          webStreamRef.current = null;
          webMediaRecorderRef.current = null;
          captureModeRef.current = null;
          setIsRecording(false);

          if (blob.size > 0) {
            await handleAudioTranscription(blob);
          } else {
            setStatusMessage(t.stNoAudio);
          }
        };

        recorder.start();
        webMediaRecorderRef.current = recorder;
        captureModeRef.current = 'recorder';
        setIsRecording(true);
        setStatusMessage(t.stRecording);
      } catch (err: any) {
        console.warn('Microphone/MediaRecorder failed:', err);
        setStatusMessage(
          err?.name === 'NotAllowedError' ? t.stPermissionDenied : t.stMicStartFail
        );
      }
      return;
    }

    // Native expo-av
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setStatusMessage(t.stMicPermMobile);
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
      setStatusMessage(t.stListeningNative);
    } catch (err: any) {
      console.warn('Native microphone error:', err);
      setStatusMessage(t.stMicErrorNative);
    }
  };

  // Stop Recording
  const stopRecording = async () => {
    if (Platform.OS === 'web') {
      if (captureModeRef.current === 'recognition' && webRecognitionRef.current) {
        try {
          webRecognitionRef.current.stop();
        } catch (e) {
          setIsRecording(false);
        }
        return;
      }

      if (webMediaRecorderRef.current && webMediaRecorderRef.current.state !== 'inactive') {
        try {
          webMediaRecorderRef.current.stop();
        } catch (e) {
          setIsRecording(false);
          setStatusMessage(t.stStopFail);
        }
        return;
      }

      setIsRecording(false);
      return;
    }

    setIsRecording(false);
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) {
        await handleAudioTranscription(uri);
      }
    } catch (err: any) {
      console.warn('Finalizing recording failed:', err);
      setRecording(null);
      setStatusMessage(t.stFinalizeFail);
    }
  };

  const handleAudioTranscription = async (audioData: any) => {
    setTranscribing(true);
    setStatusMessage(t.transcribing);
    try {
      const text = (await transcribeAudio(audioData, language)) || '';
      const cleaned = text.trim();
      if (cleaned) {
        updateTranscript(cleaned);
        setStatusMessage(t.stTranscribed);
      } else {
        updateTranscript('');
        setStatusMessage(t.stTranscribeFail);
      }
    } catch (e: any) {
      console.warn('Transcription failed:', e);
      updateTranscript('');
      setStatusMessage(t.stTranscriptionError);
    } finally {
      setTranscribing(false);
    }
  };

  const handleSendQuery = async (queryOverride?: string) => {
    const raw = typeof queryOverride === 'string' ? queryOverride : transcriptRef.current;
    const q = (raw || '').trim();
    if (!q) {
      setStatusMessage(t.stEmptyQuery);
      return;
    }
    if (loadingAnswer) return;

    updateTranscript(q);
    setLoadingAnswer(true);
    setStatusMessage(t.stConsulting);
    try {
      const res = await sendChatMessage({
        message: q,
        language: language,
        session_id: 'voice-session',
      });

      const answer = typeof res?.answer === 'string' ? res.answer : '';
      if (!answer.trim()) {
        throw new Error(t.stEmptyAnswer);
      }

      setAnswerData(res);
      setStatusMessage(null);

      // Auto speak answer in the selected language
      setIsSpeaking(true);
      speakLegalText(answer, language, () => {
        setIsSpeaking(false);
      });
    } catch (err: any) {
      setStatusMessage(`${t.errorTitle}: ${localizeApiError(err.message, language) || t.stRetrieveFail}`);
    } finally {
      setLoadingAnswer(false);
    }
  };

  const toggleSpeech = () => {
    if (!answerData?.answer) return;
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
          <Text style={styles.cardHeading}>{t.voiceTitle}</Text>
          <Text style={styles.cardSub}>{t.voiceDesc}</Text>

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
              {isRecording ? t.tapToStop : t.tapToSpeak}
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
              <Text style={styles.loadingLabel}>{t.transcribing}</Text>
            </View>
          )}

          {/* Editable Transcript Box */}
          <View style={styles.editSection}>
            <Text style={styles.editLabel}>{t.reviewLabel}</Text>
            <TextInput
              style={styles.transcriptInput}
              value={transcript}
              onChangeText={updateTranscript}
              placeholder={t.transcriptPlaceholder}
              placeholderTextColor="#6B6963"
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
                {t.quickVoiceHeading}
              </Text>
              <View style={styles.sampleVoiceGrid}>
                <TouchableOpacity
                  style={styles.sampleVoiceCard}
                  onPress={() => handleSendQuery('Can police arrest without warrant?')}
                >
                  <Text style={styles.sampleVoiceCardIcon}>🚔</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleVoiceCardTitle}>{t.cardArrestTitle}</Text>
                    <Text style={styles.sampleVoiceCardSub}>{t.cardArrestSub}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sampleVoiceCard}
                  onPress={() => handleSendQuery('What is Zero FIR and where can I file it?')}
                >
                  <Text style={styles.sampleVoiceCardIcon}>📋</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleVoiceCardTitle}>{t.cardFirTitle}</Text>
                    <Text style={styles.sampleVoiceCardSub}>{t.cardFirSub}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sampleVoiceCard}
                  onPress={() => handleSendQuery('What is the penalty for driving without a helmet under Motor Vehicles Act?')}
                >
                  <Text style={styles.sampleVoiceCardIcon}>🪖</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleVoiceCardTitle}>{t.cardHelmetTitle}</Text>
                    <Text style={styles.sampleVoiceCardSub}>{t.cardHelmetSub}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sampleVoiceCard}
                  onPress={() => handleSendQuery('Can a store refuse refund for a defective product under Consumer Protection Act?')}
                >
                  <Text style={styles.sampleVoiceCardIcon}>🛍️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleVoiceCardTitle}>{t.cardRefundTitle}</Text>
                    <Text style={styles.sampleVoiceCardSub}>{t.cardRefundSub}</Text>
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
                <Text style={styles.sendBtnText}>{t.searchRead}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Answer Display */}
        {answerData && (
          <View style={styles.answerCard}>
            {answerData.emergency && (
              <EmergencyBanner emergency={answerData.emergency} language={language} />
            )}

            {answerData.is_cached && (
              <CacheBadge cacheType={answerData.cache_type} language={language} />
            )}

            <View style={styles.answerHeader}>
              <Text style={styles.answerTitle}>{t.statutoryAnswer}</Text>
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
              <CitationChips citations={answerData.citations} language={language} />
            )}

            <View style={styles.disclaimerRow}>
              <Text style={styles.disclaimerText}>
                ⚠️ {answerData.disclaimer || t.disclaimer}
              </Text>
              <Text style={styles.latency}>
                {t.latencyLabel} {answerData.response_time_ms} ms
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
  cardHeading: {
    fontSize: 21,
    fontWeight: '900',
    color: Colors.ink,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardSub: {
    fontSize: 13,
    color: Colors.mutedInk,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 16,
  },
  micWrapper: {
    alignItems: 'center',
    marginVertical: 14,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 0,
    backgroundColor: Colors.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: BORDER,
    borderColor: Colors.pitchBlack,
    ...Platform.select({
      web: {
        boxShadow: '7px 7px 0 #111111',
        cursor: 'pointer',
      },
      default: { elevation: 6 },
    }),
  },
  micButtonRecording: {
    backgroundColor: '#FF3B00',
    borderColor: Colors.pitchBlack,
  },
  micEmoji: {
    fontSize: 34,
  },
  micInstruction: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.ink,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    borderBottomWidth: BORDER_THIN,
    borderBottomColor: Colors.pitchBlack,
    paddingBottom: 4,
  },
  statusBox: {
    backgroundColor: Colors.yellow,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginVertical: 8,
    alignItems: 'center',
    alignSelf: 'stretch',
    borderWidth: BORDER_THIN,
    borderColor: Colors.pitchBlack,
  },
  statusText: {
    fontSize: 13,
    color: Colors.ink,
    fontWeight: '800',
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
    fontWeight: '900',
    color: Colors.ink,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transcriptInput: {
    backgroundColor: '#FFFDF7',
    borderColor: Colors.pitchBlack,
    borderWidth: BORDER_THIN,
    borderRadius: 0,
    padding: 12,
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.ink,
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
    backgroundColor: '#FFFDF7',
    borderColor: Colors.pitchBlack,
    borderWidth: BORDER_THIN,
    borderRadius: 0,
    padding: 10,
    width: Platform.OS === 'web' ? '48%' : '100%',
    minWidth: 260,
    flexGrow: 1,
    ...Platform.select({
      web: { cursor: 'pointer', boxShadow: '3px 3px 0 #111111' },
      default: { elevation: 2 },
    }),
  },
  sampleVoiceCardIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  sampleVoiceCardTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: Colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sampleVoiceCardSub: {
    fontSize: 11,
    color: Colors.mutedInk,
    fontWeight: '600',
    marginTop: 2,
  },
  sendBtn: {
    backgroundColor: Colors.pitchBlack,
    borderRadius: 0,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: BORDER,
    borderColor: Colors.pitchBlack,
    ...Platform.select({
      web: { cursor: 'pointer', boxShadow: '5px 5px 0 #111111' },
      default: { elevation: 4 },
    }),
  },
  sendBtnDisabled: {
    backgroundColor: '#A9A79F',
    borderColor: '#A9A79F',
    opacity: 0.6,
  },
  sendBtnText: {
    color: Colors.yellow,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  answerCard: {
    backgroundColor: '#FFFDF7',
    borderRadius: 0,
    padding: 18,
    borderColor: Colors.pitchBlack,
    borderWidth: BORDER,
    ...Platform.select({
      web: { boxShadow: '8px 8px 0 #111111' },
      default: { elevation: 4 },
    }),
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DC',
    paddingBottom: 8,
  },
  answerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ttsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECE7DC',
    borderRadius: 0,
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
    fontWeight: '600',
    color: Colors.ink,
    lineHeight: 22,
    marginBottom: 10,
  },
  disclaimerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ECE7DC',
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
