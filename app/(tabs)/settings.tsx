import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { getApiKey, setApiKey, deleteApiKey } from '@/hooks/useStorage';
import { testApiKey } from '@/services/anthropic';

export default function SettingsScreen() {
  const [inputKey, setInputKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  useEffect(() => {
    getApiKey().then(k => setSavedKey(k));
  }, []);

  const handleSave = async () => {
    const trimmed = inputKey.trim();
    if (!trimmed.startsWith('sk-ant-')) {
      Alert.alert('エラー', 'Anthropic の API キーは sk-ant- から始まります');
      return;
    }
    await setApiKey(trimmed);
    setSavedKey(trimmed);
    setInputKey('');
    Alert.alert('保存しました', 'API キーを保存しました');
  };

  const handleTest = async () => {
    const key = savedKey;
    if (!key) return;
    setTesting(true);
    setTestResult(null);
    const ok = await testApiKey(key);
    setTestResult(ok ? 'ok' : 'fail');
    setTesting(false);
  };

  const handleDelete = () => {
    Alert.alert('API キーを削除', '本当に削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: async () => {
          await deleteApiKey();
          setSavedKey(null);
          setTestResult(null);
        },
      },
    ]);
  };

  const maskedKey = savedKey
    ? savedKey.slice(0, 12) + '••••••••' + savedKey.slice(-4)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Text style={styles.sectionLabel}>ANTHROPIC API キー</Text>
      <View style={styles.card}>
        {savedKey ? (
          <>
            <View style={styles.row}>
              <Text style={styles.maskedKey}>{maskedKey}</Text>
              <TouchableOpacity onPress={handleDelete}>
                <Text style={styles.deleteText}>削除</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTest}
              disabled={testing}
            >
              {testing
                ? <ActivityIndicator size="small" color="#c9a84c" />
                : <Text style={styles.testBtnText}>接続テスト</Text>
              }
            </TouchableOpacity>
            {testResult === 'ok' && (
              <Text style={styles.testOk}>✅ 接続成功</Text>
            )}
            {testResult === 'fail' && (
              <Text style={styles.testFail}>❌ 接続失敗。キーを確認してください</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              Anthropic Console から発行した API キーを入力してください。{'\n'}
              キーはデバイスのキーチェーンに暗号化保存されます。
            </Text>
            <TextInput
              style={styles.input}
              value={inputKey}
              onChangeText={setInputKey}
              placeholder="sk-ant-api03-..."
              placeholderTextColor="#b8b0a0"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.saveBtn, !inputKey.trim() && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!inputKey.trim()}
            >
              <Text style={styles.saveBtnText}>保存</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={[styles.sectionLabel, { marginTop: 32 }]}>アプリ情報</Text>
      <View style={styles.card}>
        <InfoRow label="バージョン" value="0.1.0" />
        <InfoRow label="AI モデル" value="claude-sonnet-4" />
        <InfoRow label="URL フェッチ" value="Jina AI Reader" />
      </View>

    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0e8' },
  content: { padding: 20, gap: 8 },

  sectionLabel: {
    fontSize: 11, color: '#a09580',
    letterSpacing: 1.5, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: '#ede8dd', borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: '#d8d0c0', gap: 12,
  },

  hint: { fontSize: 13, color: '#6b6355', lineHeight: 20 },
  input: {
    backgroundColor: '#f5f0e8', borderWidth: 1, borderColor: '#d8d0c0',
    borderRadius: 8, padding: 12, color: '#1a1612', fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#c9a84c', borderRadius: 8,
    padding: 12, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  maskedKey: { flex: 1, fontSize: 13, color: '#1a1612' },
  deleteText: { fontSize: 13, color: '#c05050' },
  testBtn: {
    borderWidth: 1, borderColor: '#d8d0c0', borderRadius: 8,
    padding: 10, alignItems: 'center',
  },
  testBtnText: { fontSize: 13, color: '#6b6355' },
  testOk: { fontSize: 13, color: '#4a8860' },
  testFail: { fontSize: 13, color: '#c05050' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, color: '#6b6355' },
  infoValue: { fontSize: 13, color: '#a09580' },
});
