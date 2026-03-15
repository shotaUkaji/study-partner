import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
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

  // ヘッダータイトルをセッションの疑問文に設定
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

  // 初回: ソースがあればAIに最初のメッセージを自動送信
  useEffect(() => {
    if (!session || hasInit) return;
    setHasInit(true);
    if (session.messages.length === 0 && session.sources.length > 0) {
      const firstSource = session.sources[0];
      // PDF の場合は base64 をテキストとして使わず、プレースホルダーのみ送る
      // 実際の PDF は useChat の buildHistory で document ブロックに変換される
      const initMsg = buildInitialUserMessage({
        question: session.question,
        sourceContent: firstSource.type === 'pdf'
          ? '※PDF の内容は添付ファイルを参照してください'
          : firstSource.content,
        sourceRef: firstSource.originalRef,
      });
      send(initMsg);
    } else if (session.messages.length === 0) {
      // ソースなしの場合はシンプルに疑問だけ送る
      send(`【疑問】${session.question}\n\nこのテーマについて一緒に考えていきたいです。まず、この疑問を深掘りするためにどこから始めるといいか教えてください。`);
    }
  }, [session?.id]);

  // メッセージ追加時に最下部へスクロール
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
        <Text style={{ color: '#5a6080' }}>セッションが見つかりません</Text>
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
      {/* ソースバッジ */}
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

      {/* メッセージリスト */}
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
                <ActivityIndicator size="small" color="#c9a84c" />
              </View>
            </View>
          ) : null
        }
      />

      {/* エラー表示 */}
      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* 入力エリア */}
      <View style={styles.inputArea}>
        <TouchableOpacity
          style={styles.summaryBtn}
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
          placeholderTextColor="#3a3d50"
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
  container: { flex: 1, backgroundColor: '#0d0e14' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  sourceBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, paddingHorizontal: 16,
    backgroundColor: '#10121a', borderBottomWidth: 1, borderBottomColor: '#1e2030',
  },
  sourceIcon: { fontSize: 14 },
  sourceRef: { fontSize: 12, color: '#5a6080', flex: 1 },

  messageList: { padding: 16, gap: 16, paddingBottom: 8 },

  messageRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAI: { justifyContent: 'flex-start' },

  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1a1510', borderWidth: 1, borderColor: '#3a2a10',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 10, color: '#c9a84c', fontWeight: '600' },

  bubble: {
    maxWidth: '80%', borderRadius: 16, padding: 12,
  },
  bubbleUser: {
    backgroundColor: '#1e2030', borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: '#10121a', borderWidth: 1, borderColor: '#1e2030',
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 14, lineHeight: 22 },
  messageTextUser: { color: '#b0b8d0' },
  messageTextAI: { color: '#e8e0d0' },

  thinkingRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginTop: 8 },
  thinkingBubble: {
    backgroundColor: '#10121a', borderWidth: 1, borderColor: '#1e2030',
    borderRadius: 16, borderBottomLeftRadius: 4,
    padding: 12, width: 52,
  },

  errorBar: {
    backgroundColor: '#2a1010', padding: 12, marginHorizontal: 16, borderRadius: 8,
  },
  errorText: { fontSize: 13, color: '#e06c6c' },

  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, borderTopWidth: 1, borderTopColor: '#1e2030',
    backgroundColor: '#0d0e14',
  },
  summaryBtn: {
    width: 48, height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: '#2a2d3a',
    alignItems: 'center', justifyContent: 'center',
  },
  summaryBtnText: { fontSize: 11, color: '#5a6080' },
  textInput: {
    flex: 1, backgroundColor: '#10121a',
    borderWidth: 1, borderColor: '#1e2030', borderRadius: 10,
    padding: 10, paddingTop: 11, color: '#e8e0d0', fontSize: 14,
    maxHeight: 120, lineHeight: 20,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#c9a84c', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: '#0d0e14', fontWeight: '700' },
});
