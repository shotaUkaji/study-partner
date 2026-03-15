import type { AnthropicMessage } from '@/types';

const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-20250514';
const API_TIMEOUT_MS = 30000;

export const SYSTEM_PROMPT = `あなたは優秀な「調べごとコンサルタント」AIです。
ユーザーが持ってきた疑問とコンテンツを一緒に読み解くお手伝いをします。

【役割】
- コンテンツの核心を構造化して提示する（要約役）
- ソクラテス式の問いかけでユーザーの思考を深める（ファシリテーター役）
- ユーザーの疑問を起点に、関連する概念や次の問いを提案する（道案内役）

【スタイル】
- 日本語で応答する
- 答えを直接与えるのではなく問いかけを優先する
- ユーザーが「答えを教えて」と明示した場合は丁寧に説明する
- 返答の最後には必ず 1 つ、思考を促す問いを添える
- 1 回の返答は 300 字以内を目安にする

【要約メモ生成時】
「わかったこと」「まだ曖昧なこと」「次に調べること」の 3 軸で整理する。`;

export const SUMMARY_PROMPT = `このセッションの会話から、以下のフォーマットで理解マップを生成してください。

## 理解マップ

**疑問**: [最初の疑問文]

### ✅ わかったこと
- ...

### 🌀 まだ曖昧なこと
- ...

### 🔍 次に調べること
- ...`;

type ChatResponse = {
  content: string;
  error?: string;
};

export async function sendMessage(params: {
  apiKey: string;
  messages: AnthropicMessage[];
  maxTokens?: number;
}): Promise<ChatResponse> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': params.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: params.maxTokens ?? 1024,
        system: SYSTEM_PROMPT,
        messages: params.messages,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const error = await response.json();
      return { content: '', error: error.error?.message ?? 'API エラーが発生しました' };
    }

    const data = await response.json();
    const content = data.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('');

    return { content };
  } catch (e: unknown) {
    const isTimeout = e instanceof Error && e.name === 'AbortError';
    return { content: '', error: isTimeout ? 'AI の応答がタイムアウトしました（30秒）' : 'ネットワークエラーが発生しました' };
  }
}

export async function generateSummary(params: {
  apiKey: string;
  messages: AnthropicMessage[];
}): Promise<ChatResponse> {
  return sendMessage({
    apiKey: params.apiKey,
    messages: [
      ...params.messages,
      { role: 'user', content: SUMMARY_PROMPT },
    ],
    maxTokens: 2048,
  });
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
