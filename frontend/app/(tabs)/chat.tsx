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
import { getUI } from '../../constants/Translations';
import { localizeApiError } from '../../constants/ApiErrors';
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
  const t = getUI(language);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: t.chatWelcome,
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

  // Keep the assistant welcome message in the language currently selected.
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) => (m.id === 'welcome-1' ? { ...m, text: t.chatWelcome } : m))
    );
  }, [language]);

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
      setErrorMessage(localizeApiError(err.message, language) || t.chatConnectFail);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (isVoiceListening) {
      setIsVoiceListening(false);
      return;
    }

    setErrorMessage(null);

    if (Platform.OS === 'web') {
      const SpeechRec =
        typeof window !== 'undefined' &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

      if (!SpeechRec) {
        setErrorMessage(t.chatMicUnavailable);
        return;
      }

      try {
        const rec = new SpeechRec();
        rec.lang = getSpeechLanguageCode(language);
        rec.interimResults = false;
        rec.maxAlternatives = 1;

        setIsVoiceListening(true);
        let captured = false;

        rec.onresult = (e: any) => {
          const speech = e.results?.[0]?.[0]?.transcript;
          if (speech && speech.trim()) {
            captured = true;
            setIsVoiceListening(false);
            handleSend(speech.trim());
          }
        };
        rec.onerror = (e: any) => {
          setIsVoiceListening(false);
          if (!captured) {
            setErrorMessage(
              e?.error === 'not-allowed'
                ? t.chatMicDenied
                : t.chatSpeechNotRecognized
            );
          }
        };
        rec.onend = () => {
          setIsVoiceListening(false);
        };
        rec.start();
      } catch (e) {
        setIsVoiceListening(false);
        setErrorMessage(t.chatSpeechStartFail);
      }
      return;
    }

    setErrorMessage(t.chatVoiceMobileHint);
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
                  <EmergencyBanner emergency={msg.emergency} language={language} />
                )}

                {/* Cached badge */}
                {!isUser && msg.isCached && (
                  <CacheBadge cacheType={msg.cacheType} language={language} />
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
                  <CitationChips citations={msg.citations} language={language} />
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
              <Text style={styles.loadingText}>{t.chatRetrieving}</Text>
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
            <Text style={styles.suggestionChipText}>{t.chipZeroFir}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestionChip}
            onPress={() => handleSend('Can police arrest a woman after sunset?')}
          >
            <Text style={styles.suggestionChipText}>{t.chipWomenArrest}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestionChip}
            onPress={() => handleSend('What is the penalty for driving without a helmet under Motor Vehicles Act?')}
          >
            <Text style={styles.suggestionChipText}>{t.chipHelmet}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestionChip}
            onPress={() => handleSend('Can a store refuse refund for a defective product under Consumer Protection Act?')}
          >
            <Text style={styles.suggestionChipText}>{t.chipRefund}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.suggestionChip}
            onPress={() => handleSend('What is the time limit for PIO to reply to an RTI application?')}
          >
            <Text style={styles.suggestionChipText}>{t.chipRti}</Text>
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
          placeholder={isVoiceListening ? t.chatListeningPlaceholder : t.typePlaceholder}
          placeholderTextColor="#A9A79F"
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
    borderRadius: 0,
    backgroundColor: Colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 2,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  avatarIcon: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: Platform.OS === 'web' ? '82%' : '88%',
    borderRadius: 0,
    padding: 14,
  },
  userBubble: {
    backgroundColor: Colors.navy,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#FFFDF7',
    borderColor: Colors.cardBorder,
    borderWidth: 2,
    borderBottomLeftRadius: 4,
    ...Platform.select({
      web: { boxShadow: '5px 5px 0 #111111' },
      default: { elevation: 4 },
    }),
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFDF7',
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
    borderTopColor: '#ECE7DC',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
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
    borderRadius: 0,
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
  },
  feedbackSelected: {
    backgroundColor: '#E6F6EC',
    borderColor: '#00A86B',
  },
  feedbackSelectedDown: {
    backgroundColor: '#FFE9E3',
    borderColor: '#FF3B00',
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
    backgroundColor: '#FFE9E3',
    borderColor: '#FF3B00',
    borderWidth: 2,
    borderRadius: 0,
    padding: 10,
    marginVertical: 8,
  },
  errorText: {
    color: '#C22A00',
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFDF7',
    borderTopWidth: 1,
    borderTopColor: '#111111',
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    maxHeight: 120,
  },
  voiceMicBtn: {
    backgroundColor: '#ECE7DC',
    borderColor: '#111111',
    borderWidth: 3,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  voiceMicBtnActive: {
    backgroundColor: '#FFE9E3',
    borderColor: '#FF3B00',
    borderWidth: 2,
  },
  voiceMicIcon: {
    fontSize: 18,
  },
  sendButton: {
    backgroundColor: Colors.navy,
    borderRadius: 0,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: Colors.gold,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  sendDisabled: {
    backgroundColor: '#A9A79F',
    borderColor: '#A9A79F',
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFDF7',
    fontWeight: '800',
    fontSize: 14,
  },
  quickSuggestionsContainer: {
    backgroundColor: '#FFFDF7',
    borderTopWidth: 1,
    borderTopColor: '#111111',
    paddingVertical: 8,
  },
  quickSuggestionsContent: {
    paddingHorizontal: 14,
    gap: 8,
    alignItems: 'center',
  },
  suggestionChip: {
    backgroundColor: '#FFFDF7',
    borderColor: '#111111',
    borderWidth: 2,
    borderRadius: 0,
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
