export type SourceType = 'url' | 'pdf' | 'text';

export type Source = {
  id: string;
  sessionId: string;
  type: SourceType;
  originalRef: string; // URL / ファイル名 / テキスト冒頭40字
  content: string;     // フェッチ・抽出済みテキスト
  fetchedAt: string;
};

export type Message = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type UserMemo = {
  id: string;
  sessionId: string;
  content: string;
  timestamp: string;
  linkedMessageId?: string;
};

export type Session = {
  id: string;
  question: string;
  sources: Source[];
  messages: Message[];
  summaryMemo: string | null;
  userMemos: UserMemo[];
  createdAt: string;
  updatedAt: string;
};

// Anthropic API
export type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

export type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
};
