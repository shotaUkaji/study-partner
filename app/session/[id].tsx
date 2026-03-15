import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useSessionStore } from '@/store/sessionStore';
import { useChat, buildInitialUserMessage } from '@/hooks/useChat';
import { generateSummary } from '@/services/anthropic';
import { getApiKey } from '@/hooks/useStorage';
import type { Message } from '@/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);

  const { getSession, updateSummary } = useSessionStore();
  const session = getSession(id);
  const { send, isSending, error } = useChat(id);

  const [input, setInput] = useState('');
  const [hasInit, setHasInit] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // 点滅アニメーション
  const dotAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isSending) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isSending]);

  useEffect(() => {
    if (session) {
      navigation.setOptions({
        title: session.question.length > 24
          ? session.question.slice(0, 24) + '…'
          : session.question,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push(`/session/${id}/memo`)}
            style={{ marginRight: 4 }}
          >
            <Text style={{ color: '#c9a84c', fontSize: 13 }}>メモ</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [session?.question]);

  useEffect(() => {
    if (!session || hasInit) return;
    setHasInit(true);
    if (session.messages.length === 0 && session.sources.length > 0) {
      const firstSource = session.sources[0];
      const initMsg = buildInitialUserMessage({
        question: session.question,
        sourceContent: firstSource.type === 'pdf'
          ? '※PDF の内容は添付ファイルを参照してください'
          : firstSource.content,
        sourceRef: firstSource.originalRef,
      });
      send(initMsg);
    } else if (session.messages.length === 0) {
      send(`【疑問】${session.question}\n\nこのテーマについて一緒に考えていきたいです。まず、この疑問を深掘りするためにどこから始めるといいか教えてください。`);
    }
  }, [session?.id]);

  useEffect(() => {
    if ((session?.messages.length ?? 0) > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [session?.messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const text = input.trim();
    setInput('');
    await send(text);
  };

  const handleSummarize = async () => {
    const apiKey = await getApiKey();
    if (!apiKey || !session) return;
    setIsSummarizing(true);
    const messages = session.messages.map(m => ({ role: m.role, content: m.content }));
    const result = await generateSummary({ apiKey, messages });
    if (result.content) {
      await updateSummary(id, result.content);
      router.push(`/session/${id}/memo`);
    } else {
      Alert.alert('エラー', result.error ?? '要約の生成に失敗しました');
    }
    setIsSummarizing(false);
  };

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: '#a09580' }}>セッションが見つかりません</Text>
      </View>
    );
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageRow,
      item.role === 'user' ? styles.messageRowUser : styles.messageRowAI,
    ]}>
      {item.role === 'assistant' && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}
      <View style={[
        styles.bubble,
        item.role === 'user' ? styles.bubbleUser : styles.bubbleAI,
      ]}>
        <Text style={[
          styles.messageText,
          item.role === 'user' ? styles.messageTextUser : styles.messageTextAI,
        ]}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {session.sources.length > 0 && (
        <View style={styles.sourceBar}>
          <Text style={styles.sourceIcon}>
            {session.sources[0].type === 'url' ? '🔗' : session.sources[0].type === 'pdf' ? '📄' : '📝'}
          </Text>
          <Text style={styles.sourceRef} numberOfLines={1}>
            {session.sources[0].originalRef}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={session.messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListFooterComponent={
          isSending ? (
            <View style={styles.thinkingRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>AI</Text>
              </View>
              <View style={styles.thinkingBubble}>
                <Animated.View style={{ opacity: dotAnim }}>
                  <Text style={styles.thinkingDots}>●●●</Text>
                </Animated.View>
                <Text style={styles.thinkingLabel}>考えています...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.inputArea}>
        <TouchableOpacity
          style={[
            styles.summaryBtn,
            (isSummarizing || session.messages.length < 4) && styles.summaryBtnDisabled,
          ]}
          onPress={handleSummarize}
          disabled={isSummarizing || session.messages.length < 4}
        >
          {isSummarizing
            ? <ActivityIndicator size="small" color="#c9a84c" />
            : <Text style={styles.summaryBtnText}>まとめ</Text>
          }
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="質問・考えを入力..."
          placeholderTextColor="#b8b0a0"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isSending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isSending}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0e8' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  sourceBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, paddingHorizontal: 16,
    backgroundColor: '#ede8dd', borderBottomWidth: 1, borderBottomColor: '#d8d0c0',
  },
  sourceIcon: { fontSize: 14 },
  sourceRef: { fontSize: 12, color: '#a09580', flex: 1 },

  messageList: { padding: 16, gap: 16, paddingBottom: 8 },

  messageRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAI: { justifyContent: 'flex-start' },

  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fdf5e0', borderWidth: 1, borderColor: '#e8d080',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 10, color: '#c9a84c', fontWeight: '600' },

  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  bubbleUser: {
    backgroundColor: '#c9a84c', borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: '#ede8dd', borderWidth: 1, borderColor: '#d8d0c0',
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 14, lineHeight: 22 },
  messageTextUser: { color: '#fff' },
  messageTextAI: { color: '#1a1612' },

  thinkingRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginTop: 8 },
  thinkingBubble: {
    backgroundColor: '#ede8dd', borderWidth: 1, borderColor: '#d8d0c0',
    borderRadius: 16, borderBottomLeftRadius: 4,
    padding: 12, gap: 4,
  },
  thinkingDots: { fontSize: 10, color: '#c9a84c', letterSpacing: 2 },
  thinkingLabel: { fontSize: 12, color: '#a09580' },

  errorBar: {
    backgroundColor: '#fde8e8', padding: 12, marginHorizontal: 16, borderRadius: 8,
  },
  errorText: { fontSize: 13, color: '#c05050' },

  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, borderTopWidth: 1, borderTopColor: '#d8d0c0',
    backgroundColor: '#f5f0e8',
  },
  summaryBtn: {
    width: 48, height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: '#d8d0c0',
    backgroundColor: '#ede8dd',
    alignItems: 'center', justifyContent: 'center',
  },
  summaryBtnDisabled: { opacity: 0.4 },
  summaryBtnText: { fontSize: 11, color: '#6b6355' },
  textInput: {
    flex: 1, backgroundColor: '#ede8dd',
    borderWidth: 1, borderColor: '#d8d0c0', borderRadius: 10,
    padding: 10, paddingTop: 11, color: '#1a1612', fontSize: 14,
    maxHeight: 120, lineHeight: 20,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#c9a84c', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: '#fff', fontWeight: '700' },
});
