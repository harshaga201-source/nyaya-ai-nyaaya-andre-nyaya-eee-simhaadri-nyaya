import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { TRANSLATIONS } from '../../constants/Translations';
import { LanguageContext } from '../_layout';
import { Header } from '../../components/Header';
import { CitationChips } from '../../components/CitationChip';
import { CacheBadge } from '../../components/CacheBadge';
import { EmergencyBanner } from '../../components/EmergencyBanner';
import { speakLegalText, stopLegalSpeech, getSpeechLanguageCode } from '../../components/VoiceSpeech';
import { sendChatMessage, submitFeedback, CitationItem, EmergencyPayload } from '../../services/api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: CitationItem[];
  isCached?: boolean;
  cacheType?: string;
  emergency?: EmergencyPayload;
  responseTimeMs?: number;
  feedback?: 'up' | 'down';
}

export default function ChatScreen() {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `Namaste! I am NyayaSathi, your Indian Legal Awareness Assistant. I provide statutory information strictly referenced to Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), Motor Vehicles Act, Consumer Protection Act, and RTI Act.\n\nAsk any question by typing below or tapping voice. Every claim is cited directly from legal codes.`,
      citations: [
        { act: 'Bharatiya Nagarik Suraksha Sanhita, 2023', section: 'Section 35', title: 'Arrest & Notice' },
        { act: 'Motor Vehicles Act, 1988', section: 'Section 208', title: 'Virtual Court' },
        { act: 'Consumer Protection Act, 2019', section: 'Section 35', title: 'e-Daakhil Filing' }
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const handleSend = async (overrideText?: string) => {
    const raw = typeof overrideText === 'string' ? overrideText : inputText;
    const q = raw.trim();
    if (!q || loading) return;

    setErrorMessage(null);
    const userMsgId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: q,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const res = await sendChatMessage({
        message: q,
        language: language,
        session_id: 'nyayasathi-session-1',
      });

      const assistantMsg: Message = {
        id: `assist-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        citations: res.citations,
        isCached: res.is_cached,
        cacheType: res.cache_type,
        emergency: res.emergency,
        responseTimeMs: res.response_time_ms,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to the legal database.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (isVoiceListening) {
      setIsVoiceListening(false);
      return;
    }
    setIsVoiceListening(true);

    if (Platform.OS === 'web') {
      const SpeechRec =
        typeof window !== 'undefined' &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.lang = getSpeechLanguageCode(language);
          rec.interimResults = false;
          rec.maxAlternatives = 1;

          let captured = false;
          rec.onresult = (e: any) => {
            const speech = e.results[0][0].transcript;
            if (speech && speech.trim()) {
              captured = true;
              setIsVoiceListening(false);
              handleSend(speech.trim());
            }
          };
          rec.onerror = () => {
            if (!captured) {
              const fallback = 'What are my legal rights if stopped by police?';
              setIsVoiceListening(false);
              handleSend(fallback);
            }
          };
          rec.onend = () => {
            setIsVoiceListening(false);
          };
          rec.start();
          return;
        } catch (e) {}
      }
    }

    // Default simulated voice capture if mic unavailable
    setTimeout(() => {
      setIsVoiceListening(false);
      const fallback = 'What are my legal rights if stopped by police?';
      handleSend(fallback);
    }, 1500);
  };

  const handleSpeechToggle = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      stopLegalSpeech();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(msgId);
      speakLegalText(text, language, () => {
        setSpeakingMsgId(null);
      });
    }
  };

  const handleFeedback = async (msgId: string, type: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: type } : m))
    );
    try {
      await submitFeedback({
        rating: type === 'up' ? 5 : 2,
        category: 'chat_answer_accuracy',
        comment: `User marked answer as ${type === 'up' ? 'helpful' : 'flagged'}`,
        message_id: msgId,
        is_flagged: type === 'down',
      });
    } catch (e) {
      console.warn('Feedback submit error:', e);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Header currentLanguage={language} onLanguageChange={setLanguage} />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.chatScroll}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isSpeaking = speakingMsgId === msg.id;

          return (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                isUser ? styles.userRow : styles.assistantRow,
              ]}
            >
              {!isUser && (
                <View style={styles.assistantAvatar}>
                  <Text style={styles.avatarIcon}>⚖️</Text>
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  isUser ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                {/* Emergency banner on assistant messages if triggered */}
                {!isUser && msg.emergency && (
                  <EmergencyBanner emergency={msg.emergency} />
                )}

                {/* Cached badge */}
                {!isUser && msg.isCached && (
                  <CacheBadge cacheType={msg.cacheType} />
                )}

                <Text
                  style={[
                    styles.messageText,
                    isUser ? styles.userText : styles.assistantText,
                  ]}
                >
                  {msg.text}
                </Text>

                {/* Citations as chips */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <CitationChips citations={msg.citations} />
                )}

                {/* Assistant footer: Latency, TTS, Thumbs Up / Down */}
                {!isUser && (
                  <View style={styles.bubbleFooter}>
                    <View style={styles.leftActions}>
                      <TouchableOpacity
                        style={[styles.ttsButton, isSpeaking && styles.ttsActive]}
                        onPress={() => handleSpeechToggle(msg.id, msg.text)}
                      >
                        <Text style={styles.ttsIcon}>{isSpeaking ? '⏹️' : '🔊'}</Text>
                        <Text style={styles.ttsLabel}>
                          {isSpeaking ? t.stopSpeech : t.speakText}
                        </Text>
                      </TouchableOpacity>

                      {msg.responseTimeMs !== undefined && (
                        <Text style={styles.latencyText}>
                          ⏱️ {msg.responseTimeMs} ms
                        </Text>
                      )}
                    </View>

                    <View style={styles.feedbackButtons}>
                      <TouchableOpacity
                        style={[
                          styles.feedbackBtn,
                          msg.feedback === 'up' && styles.feedbackSelected,
                        ]}
                        onPress={() => handleFeedback(msg.id, 'up')}
                      >
                        <Text style={styles.feedbackEmoji}>👍</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.feedbackBtn,
                          msg.feedback === 'down' && styles.feedbackSelectedDown,
                        ]}
                        onPress={() => handleFeedback(msg.id, 'down')}
                      >
                        <Text style={styles.feedbackEmoji}>👎</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={[styles.messageRow, styles.assistantRow]}>
            <View style={styles.assistantAvatar}>
              <Text style={styles.avatarIcon}>⚖️</Text>
            </View>
            <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
              <ActivityIndicator color={Colors.gold} size="small" />
              <Text style={styles.loadingText}>Retrieving statutory sections & verifying citations...</Text>
            </View>
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick suggestions */}
      <View style={styles.quickSuggestionsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickSuggestionsContent}>
          <TouchableOpacity
            style={styles.suggestionChip}
            onPress={() => handleSend('What is Zero FIR and where can it be filed?')}
          >
            <Text style={styles.suggestionChipText}>📋 Zero FIR rights</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestionChip}
            onPress={() => handleSend('Can police arrest a woman after sunset?')}
          >
            <Text style={styles.suggestionChipText}>👩 Arrest of women safeguards</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestionChip}
            onPress={() => handleSend('What is the penalty for driving without a helmet under Motor Vehicles Act?')}
          >
            <Text style={styles.suggestionChipText}>🪖 Helmet fine (MVA S.194D)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestionChip}
            onPress={() => handleSend('Can a store refuse refund for a defective product under Consumer Protection Act?')}
          >
            <Text style={styles.suggestionChipText}>🛍️ Defective product refund</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestionChip}
            onPress={() => handleSend('What is the time limit for PIO to reply to an RTI application?')}
          >
            <Text style={styles.suggestionChipText}>⏱️ RTI 30-day timeline</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[styles.voiceMicBtn, isVoiceListening && styles.voiceMicBtnActive]}
          onPress={handleVoiceInput}
          activeOpacity={0.8}
        >
          <Text style={styles.voiceMicIcon}>{isVoiceListening ? '⏹️' : '🎙️'}</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder={isVoiceListening ? '🎙️ Listening... Speak legal query' : t.typePlaceholder}
          placeholderTextColor="#94A3B8"
          value={inputText}
          onChangeText={setInputText}
          multiline={Platform.OS !== 'web'}
          maxLength={1000}
          onSubmitEditing={() => handleSend()}
          onKeyPress={(e: any) => {
            if (Platform.OS === 'web' && e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
              e.preventDefault?.();
              handleSend();
            }
          }}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || loading}
        >
          <Text style={styles.sendButtonText}>{t.send}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  chatScroll: {
    padding: 14,
    paddingBottom: 20,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  avatarIcon: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: Platform.OS === 'web' ? '82%' : '88%',
    borderRadius: 16,
    padding: 14,
  },
  userBubble: {
    backgroundColor: Colors.navy,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    borderBottomLeftRadius: 4,
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)' },
      default: { elevation: 1 },
    }),
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  assistantText: {
    color: Colors.textPrimary,
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ttsActive: {
    backgroundColor: Colors.cacheBadgeBg,
    borderColor: Colors.gold,
  },
  ttsIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  ttsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.navy,
  },
  latencyText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  feedbackBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  feedbackSelected: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  feedbackSelectedDown: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  feedbackEmoji: {
    fontSize: 13,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    maxHeight: 120,
  },
  voiceMicBtn: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  voiceMicBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  voiceMicIcon: {
    fontSize: 18,
  },
  sendButton: {
    backgroundColor: Colors.navy,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  sendDisabled: {
    backgroundColor: '#94A3B8',
    borderColor: '#94A3B8',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  quickSuggestionsContainer: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
  },
  quickSuggestionsContent: {
    paddingHorizontal: 14,
    gap: 8,
    alignItems: 'center',
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.navy,
  },
});
