import { create } from 'zustand';
import type { Session, Message, Source, UserMemo } from '@/types';
import * as queries from '@/db/queries';

type SessionStore = {
  sessions: Session[];
  isLoading: boolean;

  // Actions
  loadSessions: () => Promise<void>;
  createSession: (question: string) => Promise<string>; // returns new session id
  deleteSession: (id: string) => Promise<void>;
  addSource: (source: Source) => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  updateSummary: (sessionId: string, summary: string) => Promise<void>;
  addUserMemo: (memo: UserMemo) => Promise<void>;
  getSession: (id: string) => Session | undefined;
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  isLoading: false,

  loadSessions: async () => {
    set({ isLoading: true });
    const sessions = await queries.getAllSessions();
    set({ sessions, isLoading: false });
  },

  createSession: async (question: string) => {
    const id = crypto.randomUUID();
    await queries.createSession({ id, question });
    const newSession: Session = {
      id, question,
      sources: [], messages: [], userMemos: [],
      summaryMemo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set(state => ({ sessions: [newSession, ...state.sessions] }));
    return id;
  },

  deleteSession: async (id: string) => {
    await queries.deleteSession(id);
    set(state => ({ sessions: state.sessions.filter(s => s.id !== id) }));
  },

  addSource: async (source: Source) => {
    await queries.createSource(source);
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === source.sessionId
          ? { ...s, sources: [...s.sources, source], updatedAt: new Date().toISOString() }
          : s
      ),
    }));
  },

  addMessage: async (message: Message) => {
    await queries.createMessage(message);
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === message.sessionId
          ? { ...s, messages: [...s.messages, message], updatedAt: new Date().toISOString() }
          : s
      ),
    }));
  },

  updateSummary: async (sessionId: string, summary: string) => {
    await queries.updateSessionSummary(sessionId, summary);
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === sessionId ? { ...s, summaryMemo: summary } : s
      ),
    }));
  },

  addUserMemo: async (memo: UserMemo) => {
    await queries.createUserMemo(memo);
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === memo.sessionId
          ? { ...s, userMemos: [...s.userMemos, memo] }
          : s
      ),
    }));
  },

  getSession: (id: string) => {
    return get().sessions.find(s => s.id === id);
  },
}));
