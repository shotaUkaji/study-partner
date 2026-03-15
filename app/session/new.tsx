import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSessionStore } from '@/store/sessionStore';
import { fetchUrlContent, isValidUrl, extractDomain } from '@/services/jina';
import { pickPdf } from '@/services/pdf';
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


  useEffect(() => {
    if (sharedUrl) {
      setTab('url');
      setUrlInput(sharedUrl);
    }
  }, [sharedUrl]);

  const canStart = question.trim().length > 0;

  const handleStart = async () => {
    if (!canStart) return;
    setIsStarting(true);

    try {
      await doStart();
    } catch (e) {
      Alert.alert('エラー', '起動に失敗しました。もう一度お試しください。');
      setIsStarting(false);
      setIsFetching(false);
    }
  };

  const doStart = async () => {
    const id = await createSession(question.trim());

    let sourceContent = '';
    let sourceRef = 'なし';
    let sourceType: Source['type'] = 'text';

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

    router.replace(`/session/${id}`);
    setIsStarting(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">

      <Text style={styles.label}>何を知りたいですか？</Text>
      <TextInput
        style={styles.questionInput}
        value={question}
        onChangeText={setQuestion}
        placeholder="例：なぜ Transformer は RNN より並列化しやすいのか？"
        placeholderTextColor="#b8b0a0"
        multiline
        autoFocus
      />

      <Text style={[styles.label, { marginTop: 24 }]}>参考コンテンツ（任意）</Text>

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
          placeholderTextColor="#b8b0a0"
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
          placeholderTextColor="#b8b0a0"
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

      <Text style={styles.hint}>コンテンツなしでも調べごとを始められます</Text>

      <TouchableOpacity
        style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
        onPress={handleStart}
        disabled={!canStart || isStarting}
        activeOpacity={0.85}
      >
        {isStarting || isFetching ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#fff" />
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
  container: { flex: 1, backgroundColor: '#f5f0e8' },
  content: { padding: 20, gap: 8 },

  label: { fontSize: 11, color: '#a09580', letterSpacing: 1.5, marginBottom: 8 },
  questionInput: {
    backgroundColor: '#ede8dd', borderWidth: 1, borderColor: '#d8d0c0',
    borderRadius: 12, padding: 16, color: '#1a1612', fontSize: 16,
    lineHeight: 26, minHeight: 100, textAlignVertical: 'top',
  },

  tabs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tab: {
    flex: 1, padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#d8d0c0', alignItems: 'center',
    backgroundColor: '#ede8dd',
  },
  tabActive: { borderColor: '#c9a84c', backgroundColor: '#fdf5e0' },
  tabText: { fontSize: 13, color: '#a09580' },
  tabTextActive: { color: '#c9a84c' },

  input: {
    backgroundColor: '#ede8dd', borderWidth: 1, borderColor: '#d8d0c0',
    borderRadius: 12, padding: 14, color: '#1a1612', fontSize: 14,
  },
  hint: { fontSize: 12, color: '#b8b0a0', marginTop: 4 },

  pdfArea: { marginBottom: 4 },
  pdfPickBtn: {
    backgroundColor: '#ede8dd', borderWidth: 1, borderColor: '#d8d0c0',
    borderRadius: 12, padding: 14, alignItems: 'center',
    borderStyle: 'dashed',
  },
  pdfPickText: { fontSize: 14, color: '#a09580' },
  pdfSelected: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ede8dd', borderWidth: 1, borderColor: '#d8d0c0',
    borderRadius: 12, padding: 14,
  },
  pdfIcon: { fontSize: 18 },
  pdfName: { flex: 1, fontSize: 14, color: '#1a1612' },
  pdfClear: { fontSize: 16, color: '#a09580', paddingHorizontal: 4 },

  startBtn: {
    backgroundColor: '#c9a84c', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
