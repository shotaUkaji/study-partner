import { useState } from 'react';
import { generateId } from '@/utils/uuid';
import { useSessionStore } from '@/store/sessionStore';
import { sendMessage } from '@/services/anthropic';
import { getApiKey } from '@/hooks/useStorage';
import type { Message, AnthropicMessage, AnthropicContentBlock, Source } from '@/types';

export function useChat(sessionId: string) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getSession, addMessage } = useSessionStore();

  const send = async (userText: string) => {
    const session = getSession(sessionId);
    if (!session) return;

    const apiKey = await getApiKey();
    if (!apiKey) {
      setError('API キーが設定されていません。設定画面から入力してください。');
      return;
    }

    setIsSending(true);
    setError(null);

    // ユーザーメッセージを保存
    const userMessage: Message = {
      id: generateId(),
      sessionId,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };
    await addMessage(userMessage);

    // Anthropic API に送るメッセージ履歴を構築
    // 最初のユーザーメッセージにはソースコンテンツを含める
    const updatedSession = getSession(sessionId);
    const pdfSource = updatedSession?.sources.find(s => s.type === 'pdf');
    const history: AnthropicMessage[] = buildHistory(updatedSession?.messages ?? [], pdfSource);

    const result = await sendMessage({ apiKey, messages: history });

    if (result.error) {
      setError(result.error);
    } else {
      const assistantMessage: Message = {
        id: generateId(),
        sessionId,
        role: 'assistant',
        content: result.content,
        timestamp: new Date().toISOString(),
      };
      await addMessage(assistantMessage);
    }

    setIsSending(false);
  };

  return { send, isSending, error };
}

function buildHistory(messages: Message[], pdfSource?: Source): AnthropicMessage[] {
  return messages.map((m, index) => {
    // PDF セッションの最初のユーザーメッセージは document ブロックに変換
    if (index === 0 && m.role === 'user' && pdfSource?.type === 'pdf') {
      return {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfSource.content,
            },
          } as AnthropicContentBlock,
          { type: 'text', text: m.content } as AnthropicContentBlock,
        ],
      };
    }
    return { role: m.role, content: m.content };
  });
}

/**
 * セッション開始時の最初のメッセージを生成する
 * 疑問文 + ソースコンテンツをまとめて送る
 */
export function buildInitialUserMessage(params: {
  question: string;
  sourceContent: string;
  sourceRef: string;
}): string {
  return `【疑問】${params.question}

【参考コンテンツ（${params.sourceRef}）】
${params.sourceContent}

上記の疑問について、このコンテンツをもとに一緒に考えていきたいです。まず、このコンテンツから私の疑問に関係する重要なポイントを整理してから、どこから深掘りするか教えてください。`;
}
