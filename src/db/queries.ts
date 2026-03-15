import { getDb } from './schema';
import type { Session, Source, Message, UserMemo } from '@/types';

// ── Sessions ──────────────────────────────────────────

export async function getAllSessions(): Promise<Session[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string; question: string; summary_memo: string | null;
    created_at: string; updated_at: string;
  }>('SELECT * FROM sessions ORDER BY updated_at DESC');

  return Promise.all(rows.map(async (row) => ({
    id: row.id,
    question: row.question,
    summaryMemo: row.summary_memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sources: await getSourcesBySession(row.id),
    messages: await getMessagesBySession(row.id),
    userMemos: await getUserMemosBySession(row.id),
  })));
}

export async function getSessionById(id: string): Promise<Session | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string; question: string; summary_memo: string | null;
    created_at: string; updated_at: string;
  }>('SELECT * FROM sessions WHERE id = ?', [id]);

  if (!row) return null;
  return {
    id: row.id,
    question: row.question,
    summaryMemo: row.summary_memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sources: await getSourcesBySession(row.id),
    messages: await getMessagesBySession(row.id),
    userMemos: await getUserMemosBySession(row.id),
  };
}

export async function createSession(params: {
  id: string; question: string;
}): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO sessions (id, question, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [params.id, params.question, now, now]
  );
}

export async function updateSessionSummary(id: string, summary: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE sessions SET summary_memo = ?, updated_at = ? WHERE id = ?',
    [summary, new Date().toISOString(), id]
  );
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
}

// ── Sources ───────────────────────────────────────────

export async function getSourcesBySession(sessionId: string): Promise<Source[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string; session_id: string; type: string;
    original_ref: string; content: string; fetched_at: string;
  }>('SELECT * FROM sources WHERE session_id = ?', [sessionId]);

  return rows.map(r => ({
    id: r.id, sessionId: r.session_id,
    type: r.type as Source['type'],
    originalRef: r.original_ref,
    content: r.content,
    fetchedAt: r.fetched_at,
  }));
}

export async function createSource(source: Source): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO sources (id, session_id, type, original_ref, content, fetched_at) VALUES (?, ?, ?, ?, ?, ?)',
    [source.id, source.sessionId, source.type, source.originalRef, source.content, source.fetchedAt]
  );
  await db.runAsync('UPDATE sessions SET updated_at = ? WHERE id = ?',
    [new Date().toISOString(), source.sessionId]);
}

// ── Messages ──────────────────────────────────────────

export async function getMessagesBySession(sessionId: string): Promise<Message[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string; session_id: string; role: string; content: string; timestamp: string;
  }>('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC', [sessionId]);

  return rows.map(r => ({
    id: r.id, sessionId: r.session_id,
    role: r.role as Message['role'],
    content: r.content, timestamp: r.timestamp,
  }));
}

export async function createMessage(message: Message): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO messages (id, session_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
    [message.id, message.sessionId, message.role, message.content, message.timestamp]
  );
  await db.runAsync('UPDATE sessions SET updated_at = ? WHERE id = ?',
    [new Date().toISOString(), message.sessionId]);
}

// ── User Memos ────────────────────────────────────────

export async function getUserMemosBySession(sessionId: string): Promise<UserMemo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string; session_id: string; content: string;
    timestamp: string; linked_message_id: string | null;
  }>('SELECT * FROM user_memos WHERE session_id = ? ORDER BY timestamp ASC', [sessionId]);

  return rows.map(r => ({
    id: r.id, sessionId: r.session_id, content: r.content,
    timestamp: r.timestamp,
    linkedMessageId: r.linked_message_id ?? undefined,
  }));
}

export async function createUserMemo(memo: UserMemo): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO user_memos (id, session_id, content, timestamp, linked_message_id) VALUES (?, ?, ?, ?, ?)',
    [memo.id, memo.sessionId, memo.content, memo.timestamp, memo.linkedMessageId ?? null]
  );
}
