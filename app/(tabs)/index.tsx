import { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useSessionStore } from '@/store/sessionStore';
import type { Session } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const { sessions, isLoading, loadSessions, deleteSession } = useSessionStore();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => { loadSessions(); }, []);

  // Share Extension から URL が共有されたら新規セッション画面に遷移
  useEffect(() => {
    if (!hasShareIntent) return;
    const url = shareIntent?.webUrl ?? shareIntent?.text ?? null;
    resetShareIntent();
    if (url) {
      router.push({ pathname: '/session/new', params: { sharedUrl: url } });
    }
  }, [hasShareIntent]);

  const renderItem = ({ item }: { item: Session }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/session/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.sourceLabel}>
          {item.sources[0]?.type === 'url' ? '🔗'
            : item.sources[0]?.type === 'pdf' ? '📄' : '📝'}
          {' '}
          {item.sources[0]
            ? item.sources[0].originalRef.length > 30
              ? item.sources[0].originalRef.slice(0, 30) + '…'
              : item.sources[0].originalRef
            : 'ソースなし'}
        </Text>
        <Text style={styles.date}>
          {new Date(item.updatedAt).toLocaleDateString('ja-JP')}
        </Text>
      </View>
      <Text style={styles.question} numberOfLines={2}>{item.question}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.msgCount}>{item.messages.length} メッセージ</Text>
        {item.summaryMemo && <Text style={styles.memoTag}>メモあり</Text>}
        <TouchableOpacity
          onPress={() => deleteSession(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.deleteBtn}>削除</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator color="#c9a84c" style={{ marginTop: 40 }} />
      ) : sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>◈</Text>
          <Text style={styles.emptyText}>
            右下の ＋ ボタンから{'\n'}調べごとを始めましょう
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={s => s.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/session/new')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0e14' },

  card: {
    backgroundColor: '#10121a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e2030',
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceLabel: { fontSize: 11, color: '#5a6080', flex: 1 },
  date: { fontSize: 11, color: '#3a3d50' },
  question: { fontSize: 15, color: '#e8e0d0', lineHeight: 22 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  msgCount: { fontSize: 11, color: '#3a3d50', flex: 1 },
  memoTag: {
    fontSize: 11, color: '#c9a84c',
    borderWidth: 1, borderColor: '#c9a84c',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  deleteBtn: { fontSize: 12, color: '#5a6080' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 40, color: '#1e2030' },
  emptyText: { fontSize: 14, color: '#3a3d50', textAlign: 'center', lineHeight: 22 },

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#c9a84c',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#c9a84c', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  fabText: { fontSize: 28, color: '#0d0e14', lineHeight: 32 },
});
