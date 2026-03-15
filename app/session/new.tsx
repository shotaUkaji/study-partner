import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSessionStore } from '@/store/sessionStore';
import { fetchUrlContent, isValidUrl, extractDomain } from '@/services/jina';
import { pickPdf } from '@/services/pdf';
import { useChat, buildInitialUserMessage } from '@/hooks/useChat';
import type { Source } from '@/types';

type InputTab = 'url' | 'text' | 'pdf';

export default function NewSessionScreen() {
  const router = useRouter();
  const { sharedUrl } = useLocalSearchParams<{ sharedUrl?: string }>();
  const { createSession, addSource } = useSessionStore();

  const [question, setQuestion] = useState('');
  const [tab, setTab] = useState<InputTab>('url');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Share Extension から URL が渡された場合は自動入力
  useEffect(() => {
    if (sharedUrl) {
      setTab('url');
      setUrlInput(sharedUrl);
    }
  }, [sharedUrl]);

  // セッションIDは作成前は空。start後に設定
  const [sessionId, setSessionId] = useState('');
  const { send } = useChat(sessionId);

  const canStart = question.trim().length > 0;

  const handleStart = async () => {
    if (!canStart) return;
    setIsStarting(true);

    // 1. セッション作成
    const id = await createSession(question.trim());
    setSessionId(id);

    let sourceContent = '';
    let sourceRef = 'なし';
    let sourceType: Source['type'] = 'text';

    // 2. コンテンツ取得
    if (tab === 'url' && urlInput.trim()) {
      if (!isValidUrl(urlInput.trim())) {
        Alert.alert('URL エラー', '有効な URL を入力してください（http:// または https://）');
        setIsStarting(false);
        return;
      }
      setIsFetching(true);
      const result = await fetchUrlContent(urlInput.trim());
      setIsFetching(false);

      if (result.error) {
        Alert.alert('取得エラー', result.error + '\n\nソースなしで続けることもできます。', [
          { text: 'キャンセル', style: 'cancel', onPress: () => setIsStarting(false) },
          { text: 'ソースなしで続ける', onPress: () => startChat(id, '', 'なし', 'text') },
        ]);
        return;
      }
      sourceContent = result.content;
      sourceRef = extractDomain(urlInput.trim());
      sourceType = 'url';

    } else if (tab === 'text' && textInput.trim()) {
      sourceContent = textInput.trim();
      sourceRef = textInput.slice(0, 40) + (textInput.length > 40 ? '…' : '');
      sourceType = 'text';

    } else if (tab === 'pdf') {
      if (!pdfBase64) {
        Alert.alert('PDF エラー', 'PDF を選択してください');
        setIsStarting(false);
        return;
      }
      sourceContent = pdfBase64;
      sourceRef = pdfName;
      sourceType = 'pdf';
    }

    await startChat(id, sourceContent, sourceRef, sourceType);
  };

  const startChat = async (
    id: string,
    content: string,
    ref: string,
    type: Source['type'],
  ) => {
    // 3. ソース保存
    if (content) {
      const source: Source = {
        id: crypto.randomUUID(),
        sessionId: id,
        type,
        originalRef: ref,
        content,
        fetchedAt: new Date().toISOString(),
      };
      await addSource(source);
    }

    // 4. チャット画面へ遷移
    // PDF の場合は content に base64 が入っているためチャット側で document ブロックとして送信される
    router.replace(`/session/${id}`);

    // 最初のメッセージは useChat の send 経由で送る
    // チャット画面側で initialMessage を受け取って自動送信する構成にするため
    // ここでは query param で渡す
    setIsStarting(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">

      {/* 疑問文入力 */}
      <Text style={styles.label}>何を知りたいですか？</Text>
      <TextInput
        style={styles.questionInput}
        value={question}
        onChangeText={setQuestion}
        placeholder="例：なぜ Transformer は RNN より並列化しやすいのか？"
        placeholderTextColor="#3a3d50"
        multiline
        autoFocus
      />

      {/* コンテンツ追加 */}
      <Text style={[styles.label, { marginTop: 24 }]}>参考コンテンツ（任意）</Text>

      {/* タブ切り替え */}
      <View style={styles.tabs}>
        {(['url', 'pdf', 'text'] as InputTab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'url' ? '🔗 URL' : t === 'pdf' ? '📄 PDF' : '📝 テキスト'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'url' && (
        <TextInput
          style={styles.input}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="https://..."
          placeholderTextColor="#3a3d50"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      )}
      {tab === 'text' && (
        <TextInput
          style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
          value={textInput}
          onChangeText={setTextInput}
          placeholder="コピーしたテキストを貼り付け..."
          placeholderTextColor="#3a3d50"
          multiline
        />
      )}
      {tab === 'pdf' && (
        <View style={styles.pdfArea}>
          {pdfBase64 ? (
            <View style={styles.pdfSelected}>
              <Text style={styles.pdfIcon}>📄</Text>
              <Text style={styles.pdfName} numberOfLines={1}>{pdfName}</Text>
              <TouchableOpacity onPress={() => { setPdfBase64(''); setPdfName(''); }}>
                <Text style={styles.pdfClear}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.pdfPickBtn}
              onPress={async () => {
                const result = await pickPdf();
                if (result && !result.error) {
                  setPdfBase64(result.base64);
                  setPdfName(result.name);
                } else if (result?.error) {
                  Alert.alert('PDF エラー', result.error);
                }
              }}
            >
              <Text style={styles.pdfPickText}>PDF を選択...</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.hint}>
        コンテンツなしでも調べごとを始められます
      </Text>

      {/* 開始ボタン */}
      <TouchableOpacity
        style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
        onPress={handleStart}
        disabled={!canStart || isStarting}
        activeOpacity={0.85}
      >
        {isStarting || isFetching ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#0d0e14" />
            <Text style={styles.startBtnText}>
              {isFetching ? 'コンテンツ取得中...' : '準備中...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.startBtnText}>調べごとを始める →</Text>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0e14' },
  content: { padding: 20, gap: 8 },

  label: { fontSize: 11, color: '#5a6080', letterSpacing: 1.5, marginBottom: 8 },
  questionInput: {
    backgroundColor: '#10121a', borderWidth: 1, borderColor: '#1e2030',
    borderRadius: 12, padding: 16, color: '#e8e0d0', fontSize: 16,
    lineHeight: 26, minHeight: 100, textAlignVertical: 'top',
  },

  tabs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tab: {
    flex: 1, padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#1e2030', alignItems: 'center',
  },
  tabActive: { borderColor: '#c9a84c', backgroundColor: '#1a1510' },
  tabText: { fontSize: 13, color: '#5a6080' },
  tabTextActive: { color: '#c9a84c' },

  input: {
    backgroundColor: '#10121a', borderWidth: 1, borderColor: '#1e2030',
    borderRadius: 12, padding: 14, color: '#e8e0d0', fontSize: 14,
  },
  hint: { fontSize: 12, color: '#3a3d50', marginTop: 4 },

  pdfArea: { marginBottom: 4 },
  pdfPickBtn: {
    backgroundColor: '#10121a', borderWidth: 1, borderColor: '#1e2030',
    borderRadius: 12, padding: 14, alignItems: 'center',
    borderStyle: 'dashed',
  },
  pdfPickText: { fontSize: 14, color: '#5a6080' },
  pdfSelected: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#10121a', borderWidth: 1, borderColor: '#1e2030',
    borderRadius: 12, padding: 14,
  },
  pdfIcon: { fontSize: 18 },
  pdfName: { flex: 1, fontSize: 14, color: '#e8e0d0' },
  pdfClear: { fontSize: 16, color: '#5a6080', paddingHorizontal: 4 },

  startBtn: {
    backgroundColor: '#c9a84c', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#0d0e14', fontWeight: '700', fontSize: 16 },
});
