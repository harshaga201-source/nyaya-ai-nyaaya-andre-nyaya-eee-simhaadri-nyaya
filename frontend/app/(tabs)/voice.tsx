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
import {
  transcribeAudio,
  sendChatMessage,
  getSpeechStatus,
  ChatResponseData,
  SpeechStatus,
} from '../../services/api';
import {
  detectLanguageFromText,
  pickRecognitionLanguage,
  languageNativeName,
  SUPPORTED_LANGUAGE_CODES,
} from '../../services/languageDetect';

interface WavCapture {
  context: any;
  stream: any;
  source: any;
  processor: any;
  chunks: Float32Array[];
  sampleRate: number;
}

function mergeChunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (!fromRate || !toRate || fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const length = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;
    const a = input[index] ?? 0;
    const b = input[index + 1] ?? a;
    output[i] = a + (b - a) * fraction;
  }
  return output;
}

function encodeWavBlob(chunks: Float32Array[], sourceRate: number): Blob {
  const merged = mergeChunks(chunks);
  const pcm = resampleLinear(merged, sourceRate, 16000);
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 16000 * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcm.length * 2, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([view], { type: 'audio/wav' });
}

export default function VoiceScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = getUI(language);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const transcriptRef = useRef('');

  const [autoDetect, setAutoDetect] = useState(true);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus | null>(null);
  const [answerLanguage, setAnswerLanguage] = useState(language);

  // Keep state and ref in sync
  const updateTranscript = (val: string) => {
    transcriptRef.current = val;
    setTranscript(val);
  };

  // Web MediaRecorder, WAV capture & SpeechRecognition references
  const webMediaRecorderRef = useRef<any>(null);
  const webStreamRef = useRef<any>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);
  const webRecognitionRef = useRef<any>(null);
  const wavCaptureRef = useRef<WavCapture | null>(null);
  const captureModeRef = useRef<'recognition' | 'recorder' | 'wav' | null>(null);
  const recordTimeoutRef = useRef<any>(null);

  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [answerData, setAnswerData] = useState<ChatResponseData | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Discover whether the backend can transcribe audio itself. When it can,
  // voice input is recorded as WAV and Whisper identifies the language
  // acoustically - no manual language choice needed.
  useEffect(() => {
    let active = true;
    getSpeechStatus()
      .then((status) => {
        if (active) setSpeechStatus(status);
      })
      .catch(() => {
        if (active) setSpeechStatus(null);
      });
    return () => {
      active = false;
    };
  }, []);

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
        const capture = wavCaptureRef.current;
        if (capture) {
          capture.processor.onaudioprocess = null;
          capture.processor.disconnect?.();
          capture.source.disconnect?.();
          capture.context.close?.();
        }
      } catch (e) {}
      wavCaptureRef.current = null;

      try {
        webStreamRef.current?.getTracks().forEach((track: any) => track.stop());
      } catch (e) {}
      webStreamRef.current = null;

      if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
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

  const applyDetectedLanguage = (code: string, announce: boolean = true) => {
    if (!code || !SUPPORTED_LANGUAGE_CODES.includes(code)) return;
    setDetectedLanguage(code);
    setAnswerLanguage(code);
    // The whole app follows the spoken language: labels, answer, TTS.
    if (code !== language) setLanguage(code);
    if (announce) {
      setStatusMessage(`${t.autoDetected}: ${languageNativeName(code)}`);
    }
  };

  const startWavCapture = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusMessage(t.stUnsupported);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const AudioCtx =
        typeof window !== 'undefined' &&
        ((window as any).AudioContext || (window as any).webkitAudioContext);
      if (!AudioCtx) {
        stream.getTracks().forEach((track: any) => track.stop());
        setStatusMessage(t.stUnsupported);
        return;
      }

      const context = new AudioCtx({ sampleRate: 16000 });
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];

      processor.onaudioprocess = (event: any) => {
        const data = event.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(data));
      };
      source.connect(processor);
      processor.connect(context.destination);

      wavCaptureRef.current = {
        context,
        stream,
        source,
        processor,
        chunks,
        sampleRate: context.sampleRate || 16000,
      };
      captureModeRef.current = 'wav';
      setIsRecording(true);
      setStatusMessage(t.stListening);

      // Safety stop so a forgotten recording cannot upload forever.
      recordTimeoutRef.current = setTimeout(() => {
        if (wavCaptureRef.current) stopWavCapture();
      }, 30000);
    } catch (err: any) {
      console.warn('Microphone/WAV capture failed:', err);
      setStatusMessage(
        err?.name === 'NotAllowedError' ? t.stPermissionDenied : t.stMicStartFail
      );
    }
  };

  const stopWavCapture = async () => {
    const capture = wavCaptureRef.current;
    if (!capture) return;
    wavCaptureRef.current = null;
    captureModeRef.current = null;
    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current);
      recordTimeoutRef.current = null;
    }

    try {
      capture.processor.onaudioprocess = null;
      capture.processor.disconnect?.();
      capture.source.disconnect?.();
      capture.stream.getTracks().forEach((track: any) => track.stop());
      await capture.context.close?.();
    } catch (e) {}

    setIsRecording(false);
    const blob = encodeWavBlob(capture.chunks, capture.sampleRate);
    if (blob.size <= 44) {
      setStatusMessage(t.stNoAudio);
      return;
    }
    await handleAudioTranscription(blob);
  };

  // Browser recognition: used on native, or when the backend has no STT
  // engine. Recognition language follows the device language when possible and
  // the transcript itself is inspected afterwards, so a mismatch still
  // resolves to the language the citizen actually spoke.
  const startBrowserRecognition = () => {
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setStatusMessage(t.stUnsupported);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = autoDetect
        ? pickRecognitionLanguage(language)
        : getSpeechLanguageCode(language);
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
        const captured = transcriptRef.current.trim();
        if (captured) {
          if (autoDetect) {
            const detection = detectLanguageFromText(captured, language);
            applyDetectedLanguage(detection.language);
          } else {
            setStatusMessage(t.stCaptured);
          }
        } else {
          setStatusMessage(t.stNoSpeechDetected);
        }
      };

      recognition.start();
      webRecognitionRef.current = recognition;
      captureModeRef.current = 'recognition';
    } catch (e) {
      console.warn('SpeechRecognition could not start:', e);
      setStatusMessage(t.stRecStartFail);
    }
  };

  // Start Recording
  const startRecording = async () => {
    if (isRecording) return;
    setStatusMessage(null);
    setAnswerData(null);

    if (Platform.OS === 'web') {
      // Preferred path: record WAV and let the server identify the language.
      if (autoDetect && speechStatus?.server_stt) {
        await startWavCapture();
        return;
      }
      startBrowserRecognition();
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
      if (captureModeRef.current === 'wav' && wavCaptureRef.current) {
        await stopWavCapture();
        return;
      }

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
    setStatusMessage(autoDetect ? t.autoDetecting : t.transcribing);
    try {
      const result = await transcribeAudio(
        audioData,
        autoDetect ? 'auto' : language,
        autoDetect
      );
      const cleaned = (result.transcript || '').trim();
      if (cleaned) {
        updateTranscript(cleaned);
        if (autoDetect) {
          const code =
            result.language && SUPPORTED_LANGUAGE_CODES.includes(result.language)
              ? result.language
              : detectLanguageFromText(cleaned, language).language;
          applyDetectedLanguage(code);
        } else {
          setStatusMessage(t.stTranscribed);
        }
      } else {
        updateTranscript('');
        setStatusMessage(result.engine === 'none' ? t.autoUnavailable : t.stTranscribeFail);
      }
    } catch (e: any) {
      console.warn('Transcription failed:', e);
      updateTranscript('');
      setStatusMessage(t.stTranscriptionError);
    } finally {
      setTranscribing(false);
    }
  };

  const handleSendQuery = async (queryOverride?: string, forceLanguage?: string) => {
    const raw = typeof queryOverride === 'string' ? queryOverride : transcriptRef.current;
    const q = (raw || '').trim();
    if (!q) {
      setStatusMessage(t.stEmptyQuery);
      return;
    }
    if (loadingAnswer) return;

    // Resolve the language from what was actually asked. Typed edits and
    // spoken input both pass through the same detector.
    const targetLanguage =
      forceLanguage ||
      (autoDetect
        ? detectLanguageFromText(q, detectedLanguage || language).language
        : language);

    updateTranscript(q);
    setAnswerLanguage(targetLanguage);
    if (autoDetect && targetLanguage !== language) {
      setLanguage(targetLanguage);
      setDetectedLanguage(targetLanguage);
    }
    setLoadingAnswer(true);
    setStatusMessage(t.stConsulting);
    try {
      const res = await sendChatMessage({
        message: q,
        language: targetLanguage,
        session_id: 'voice-session',
      });

      const answer = typeof res?.answer === 'string' ? res.answer : '';
      if (!answer.trim()) {
        throw new Error(t.stEmptyAnswer);
      }

      setAnswerData(res);
      setStatusMessage(null);

      // Auto speak answer in the spoken language
      setIsSpeaking(true);
      speakLegalText(answer, targetLanguage, () => {
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
      speakLegalText(answerData.answer, answerLanguage || language, () => {
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

          {/* Auto language detection */}
          <View style={styles.autoRow}>
            <View style={styles.autoCopy}>
              <Text style={styles.autoTitle}>{t.autoDetectTitle}</Text>
              <Text style={styles.autoHint}>{t.autoHint}</Text>
            </View>
            <TouchableOpacity
              style={[styles.autoToggle, autoDetect && styles.autoToggleOn]}
              activeOpacity={0.8}
              onPress={() => {
                setAutoDetect((value) => !value);
                setStatusMessage(null);
              }}
            >
              <Text style={styles.autoToggleText}>{autoDetect ? t.autoOn : t.autoOff}</Text>
            </TouchableOpacity>
          </View>

          {autoDetect && detectedLanguage && (
            <View style={styles.detectedBadge}>
              <Text style={styles.detectedBadgeText}>
                {t.autoDetected}: {languageNativeName(detectedLanguage)}
              </Text>
            </View>
          )}

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
            {autoDetect && !isRecording && (
              <Text style={styles.autoAnswering}>{t.autoAnswering}</Text>
            )}
          </View>

          {statusMessage && (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}

          {transcribing && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.gold} size="small" />
              <Text style={styles.loadingLabel}>
                {autoDetect ? t.autoDetecting : t.transcribing}
              </Text>
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
                  onPress={() => handleSendQuery('Can police arrest without warrant?', language)}
                >
                  <Text style={styles.sampleVoiceCardIcon}>🚔</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleVoiceCardTitle}>{t.cardArrestTitle}</Text>
                    <Text style={styles.sampleVoiceCardSub}>{t.cardArrestSub}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sampleVoiceCard}
                  onPress={() => handleSendQuery('What is Zero FIR and where can I file it?', language)}
                >
                  <Text style={styles.sampleVoiceCardIcon}>📋</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleVoiceCardTitle}>{t.cardFirTitle}</Text>
                    <Text style={styles.sampleVoiceCardSub}>{t.cardFirSub}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sampleVoiceCard}
                  onPress={() => handleSendQuery('What is the penalty for driving without a helmet under Motor Vehicles Act?', language)}
                >
                  <Text style={styles.sampleVoiceCardIcon}>🪖</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sampleVoiceCardTitle}>{t.cardHelmetTitle}</Text>
                    <Text style={styles.sampleVoiceCardSub}>{t.cardHelmetSub}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sampleVoiceCard}
                  onPress={() => handleSendQuery('Can a store refuse refund for a defective product under Consumer Protection Act?', language)}
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
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: BORDER_THIN,
    borderColor: Colors.pitchBlack,
    padding: 10,
    backgroundColor: '#F4EFE6',
    marginBottom: 10,
  },
  autoCopy: {
    flex: 1,
  },
  autoTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  autoHint: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.mutedInk,
    marginTop: 3,
    lineHeight: 16,
  },
  autoToggle: {
    minWidth: 64,
    alignItems: 'center',
    borderWidth: BORDER_THIN,
    borderColor: Colors.pitchBlack,
    backgroundColor: '#FFFDF7',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  autoToggleOn: {
    backgroundColor: Colors.yellow,
  },
  autoToggleText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.ink,
    letterSpacing: 1,
  },
  detectedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.green,
    borderWidth: BORDER_THIN,
    borderColor: Colors.pitchBlack,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  detectedBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
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
  autoAnswering: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.mutedInk,
    marginTop: 8,
    letterSpacing: 0.4,
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
