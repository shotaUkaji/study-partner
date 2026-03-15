import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Share, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useLocalSearchParams } from 'expo-router';
import { useSessionStore } from '@/store/sessionStore';
import { generateSummary } from '@/services/anthropic';
import { getApiKey } from '@/hooks/useStorage';
import type { UserMemo } from '@/types';

// シンプルな Markdown → HTML 変換（太字・見出し・箇条書き）
function mdToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

const htmlTagStyles = {
  h1: { color: '#c9a84c', fontSize: 16, fontWeight: '700' as const, marginBottom: 4 },
  h2: { color: '#c9a84c', fontSize: 15, fontWeight: '700' as const, marginBottom: 4 },
  h3: { color: '#e8e0d0', fontSize: 14, fontWeight: '600' as const, marginBottom: 2 },
  p:  { color: '#e8e0d0', fontSize: 14, lineHeight: 22 },
  li: { color: '#e8e0d0', fontSize: 14, lineHeight: 22 },
  b:  { color: '#e8e0d0', fontWeight: '700' as const },
};

export default function MemoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { getSession, addUserMemo, updateSummary } = useSessionStore();
  const session = getSession(id);

  const [newMemo, setNewMemo] = useState('');
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  // 要約未生成かつメッセージが4件以上あれば自動生成
  useEffect(() => {
    if (!session || session.summaryMemo || session.messages.length < 4) return;
    (async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return;
      setIsAutoGenerating(true);
      const messages = session.messages.map(m => ({ role: m.role, content: m.content }));
      const result = await generateSummary({ apiKey, messages });
      if (result.content) {
        await updateSummary(id, result.content);
      }
      setIsAutoGenerating(false);
    })();
  }, []);

  if (!session) return (
    <View style={styles.centered}>
      <Text style={{ color: '#5a6080' }}>セッションが見つかりません</Text>
    </View>
  );

  const handleAddMemo = async () => {
    if (!newMemo.trim()) return;
    const memo: UserMemo = {
      id: crypto.randomUUID(),
      sessionId: id,
      content: newMemo.trim(),
      timestamp: new Date().toISOString(),
    };
    await addUserMemo(memo);
    setNewMemo('');
  };

  const handleExport = async () => {
    const lines: string[] = [
      `# ${session.question}`,
      `作成: ${new Date(session.createdAt).toLocaleDateString('ja-JP')}`,
      '',
    ];
    if (session.summaryMemo) {
      lines.push(session.summaryMemo, '');
    }
    if (session.userMemos.length > 0) {
      lines.push('## 自分のメモ', '');
      session.userMemos.forEach(m => {
        lines.push(`- ${m.content}`);
      });
    }
    await Share.share({ message: lines.join('\n') });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">

      {/* ヘッダー */}
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>{session.question}</Text>
        <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
          <Text style={styles.exportText}>共有</Text>
        </TouchableOpacity>
      </View>

      {/* AI 要約メモ */}
      <Text style={styles.sectionLabel}>AI 理解マップ</Text>
      <View style={styles.card}>
        {isAutoGenerating ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator size="small" color="#c9a84c" />
            <Text style={styles.emptyHint}>AI が理解マップを生成中...</Text>
          </View>
        ) : session.summaryMemo ? (
          <RenderHtml
            contentWidth={width - 72}
            source={{ html: mdToHtml(session.summaryMemo) }}
            tagsStyles={htmlTagStyles}
            baseStyle={{ color: '#e8e0d0', fontSize: 14 }}
          />
        ) : (
          <Text style={styles.emptyHint}>
            チャット画面の「まとめ」ボタンで AI が要約を生成します
          </Text>
        )}
      </View>

      {/* 自分のメモ */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>自分のメモ</Text>

      <View style={styles.memoInputRow}>
        <TextInput
          style={styles.memoInput}
          value={newMemo}
          onChangeText={setNewMemo}
          placeholder="気づきを追加..."
          placeholderTextColor="#3a3d50"
          multiline
        />
        <TouchableOpacity
          style={[styles.addBtn, !newMemo.trim() && styles.addBtnDisabled]}
          onPress={handleAddMemo}
          disabled={!newMemo.trim()}
        >
          <Text style={styles.addBtnText}>追加</Text>
        </TouchableOpacity>
      </View>

      {session.userMemos.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyHint}>気づきやメモを追加できます</Text>
        </View>
      ) : (
        session.userMemos.slice().reverse().map(memo => (
          <View key={memo.id} style={styles.memoCard}>
            <Text style={styles.memoText}>{memo.content}</Text>
            <Text style={styles.memoDate}>
              {new Date(memo.timestamp).toLocaleString('ja-JP', {
                month: 'numeric', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
        ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0e14' },
  content: { padding: 20, gap: 8, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  title: { flex: 1, fontSize: 16, color: '#e8e0d0', lineHeight: 24 },
  exportBtn: {
    borderWidth: 1, borderColor: '#2a2d3a', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  exportText: { fontSize: 12, color: '#8888a0' },

  sectionLabel: { fontSize: 11, color: '#5a6080', letterSpacing: 1.5, marginBottom: 8 },
  card: {
    backgroundColor: '#10121a', borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: '#1e2030',
  },
  emptyHint: { fontSize: 13, color: '#3a3d50', lineHeight: 20 },

  memoInputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 8 },
  memoInput: {
    flex: 1, backgroundColor: '#10121a',
    borderWidth: 1, borderColor: '#1e2030',
    borderRadius: 10, padding: 12, color: '#e8e0d0', fontSize: 14,
    maxHeight: 100, textAlignVertical: 'top',
  },
  addBtn: {
    backgroundColor: '#c9a84c', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#0d0e14', fontWeight: '700', fontSize: 13 },

  memoCard: {
    backgroundColor: '#10121a', borderRadius: 10,
    padding: 14, borderWidth: 1, borderColor: '#1e2030',
    marginBottom: 8, gap: 6,
  },
  memoText: { fontSize: 14, color: '#e8e0d0', lineHeight: 22 },
  memoDate: { fontSize: 11, color: '#3a3d50' },
});
