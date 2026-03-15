# Study Partner — Claude Code コンテキスト

## プロジェクト概要

「調べごとコンサル」型 AI ラーニングアプリ。
ユーザーの疑問を起点に、AI がソクラテス式の問いかけでコンテンツを一緒に読み解く。

**プラットフォーム**: React Native + Expo（iOS / Android 両対応）

---

## 技術スタック

| 領域 | ライブラリ |
|---|---|
| フレームワーク | React Native + Expo SDK 52 |
| ナビゲーション | Expo Router v4 |
| 状態管理 | Zustand v5 |
| ローカル DB | expo-sqlite v15 |
| API キー保存 | expo-secure-store |
| PDF 選択 | expo-document-picker |
| Share Extension | expo-share-intent |
| Markdown 表示 | react-native-markdown-display |
| スタイリング | NativeWind（Tailwind for RN） |
| AI | Anthropic API（claude-sonnet-4-20250514） |
| URL 取得 | Jina AI Reader（`https://r.jina.ai/{url}`） |

---

## ディレクトリ構成

```
study-partner/
├── CLAUDE.md                  # このファイル
├── app.json
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── babel.config.js
│
├── app/                       # Expo Router のルート
│   ├── _layout.tsx            # ルートレイアウト（フォント・ストア初期化）
│   ├── (tabs)/
│   │   ├── _layout.tsx        # タブナビゲーション定義
│   │   ├── index.tsx          # ホーム（セッション一覧）
│   │   └── settings.tsx       # 設定（API キー入力）
│   └── session/
│       ├── new.tsx            # 新規セッション作成
│       ├── [id].tsx           # チャット画面
│       └── [id]/
│           └── memo.tsx       # セッションメモ
│
└── src/
    ├── types/
    │   └── index.ts           # 全型定義（Session, Message, Source, UserMemo）
    │
    ├── db/
    │   ├── schema.ts          # SQLite テーブル定義・マイグレーション
    │   └── queries.ts         # CRUD クエリ関数
    │
    ├── store/
    │   └── sessionStore.ts    # Zustand グローバルストア
    │
    ├── services/
    │   ├── anthropic.ts       # Anthropic API クライアント（ストリーミング対応）
    │   ├── jina.ts            # URL → テキスト取得（Jina Reader）
    │   └── pdf.ts             # PDF → テキスト抽出
    │
    ├── hooks/
    │   ├── useSession.ts      # セッション CRUD フック
    │   ├── useChat.ts         # チャット送信・ストリーミングフック
    │   └── useStorage.ts      # expo-secure-store ラッパー
    │
    └── components/
        ├── common/
        │   ├── Button.tsx
        │   ├── TextInput.tsx
        │   └── LoadingDots.tsx
        ├── session/
        │   ├── SessionCard.tsx    # ホームのセッションカード
        │   └── SourceBadge.tsx    # URL/PDF/テキスト種別バッジ
        └── chat/
            ├── MessageBubble.tsx  # チャット吹き出し
            ├── SourceHeader.tsx   # チャット上部のソースカード
            └── ChatInput.tsx      # 入力欄コンポーネント
```

---

## データモデル（src/types/index.ts）

```typescript
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

export type Source = {
  id: string;
  sessionId: string;
  type: 'url' | 'pdf' | 'text';
  originalRef: string;
  content: string;
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
```

---

## AI システムプロンプト

```
あなたは優秀な「調べごとコンサルタント」AIです。
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
「わかったこと」「まだ曖昧なこと」「次に調べること」の 3 軸で整理する。
```

---

## 実装フェーズ

### Phase 1（今ここ）— コア MVP

実装順序：

1. `src/types/index.ts` — 型定義
2. `src/db/schema.ts` — SQLite スキーマ・マイグレーション
3. `src/db/queries.ts` — CRUD クエリ
4. `src/store/sessionStore.ts` — Zustand ストア
5. `src/hooks/useStorage.ts` — API キー管理
6. `src/services/jina.ts` — URL フェッチ
7. `src/services/anthropic.ts` — AI クライアント
8. `src/hooks/useChat.ts` — チャットロジック
9. `app/(tabs)/settings.tsx` — 設定画面
10. `app/(tabs)/index.tsx` — ホーム
11. `app/session/new.tsx` — 新規セッション
12. `app/session/[id].tsx` — チャット画面

### Phase 2 — コンテンツ取得拡充

- PDF インポート（`src/services/pdf.ts`）
- Safari Share Extension（expo-share-intent）
- AI 要約メモ自動生成

### Phase 3 — 履歴・メモ

- ユーザーメモ機能
- `app/session/[id]/memo.tsx`
- エクスポート機能

---

## 重要な実装ルール

### Anthropic API 呼び出し

```typescript
// src/services/anthropic.ts
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: conversationHistory,
  }),
});
```

### Jina Reader（URL → テキスト）

```typescript
// src/services/jina.ts
const text = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`)
  .then(res => res.text());
```

### expo-secure-store（API キー保存）

```typescript
import * as SecureStore from 'expo-secure-store';
const KEY = 'anthropic_api_key';
await SecureStore.setItemAsync(KEY, apiKey);
const apiKey = await SecureStore.getItemAsync(KEY);
```

### expo-sqlite（DB 初期化パターン）

```typescript
import * as SQLite from 'expo-sqlite';
const db = await SQLite.openDatabaseAsync('study_partner.db');
await db.execAsync(`PRAGMA journal_mode = WAL;`);
await db.execAsync(CREATE_TABLES_SQL);
```

---

## コーディング規約

- **言語**: TypeScript strict モード（`"strict": true`）
- **コンポーネント**: 関数コンポーネント + Hooks のみ
- **スタイル**: NativeWind（`className` プロパティ）。StyleSheet は使わない
- **非同期**: async/await を使用。Promise チェーンは書かない
- **エラーハンドリング**: 全 API 呼び出しに try/catch を付ける
- **ID 生成**: `crypto.randomUUID()` を使用
- **日時**: ISO 8601 文字列（`new Date().toISOString()`）

---

## コミット規約

機能追加・修正を行ったら、**作業単位ごとに必ずコミットする**。
まとめてコミットせず、変更の意図が明確な粒度で刻む。

### プレフィックス

| プレフィックス | 用途 |
|---|---|
| `feat:` | 新機能追加 |
| `fix:` | バグ修正 |
| `refactor:` | 動作変更なしのリファクタリング |
| `docs:` | ドキュメント・コメント変更 |
| `chore:` | 依存関係・設定ファイルの更新 |

### 粒度の目安

- 1 画面 or 1 機能 = 1 コミット
- 型定義の変更 → サービス変更 → 画面変更 のように依存順に分割するとなお良い
- バグ修正は修正のみで 1 コミット（関係ない改善を混ぜない）

### メッセージの書き方

1行目にプレフィックス＋概要、空行を挟んで本文に **なぜその変更をしたか** を書く。

```
feat: PDF インポート機能を追加

expo-document-picker で PDF を選択し、base64 で Source に保存する。
Anthropic API の document ブロックとして送信することでテキスト抽出不要にした。
```

- 1行目は 50 字以内を目安
- 本文は「何をしたか」より「**なぜ**・**何のために**」を優先
- 自明な変更（typo 修正など）は1行でも可

### 依存関係を変更したとき

`package.json` / `package-lock.json` が変わるコミットには必ず理由を書く。

```
chore: patch-package を追加

react-native-css-interop@0.2.3 が reanimated v4 用の
worklets/plugin を無条件で require するバグがある。
v3 環境では不要なため patch-package でパッチを当てて対処。
```

### コマンド

```bash
git add <ファイル>          # 関係するファイルだけ指定（git add . は避ける）
git commit                  # エディタで本文まで書く場合
git commit -m "fix: ..." -m "本文をここに書く"  # コマンドラインで完結させる場合
git push
```

---

## よくあるコマンド

```bash
# 開発サーバー起動
npx expo start

# iOS シミュレーター
npx expo run:ios

# Android エミュレーター
npx expo run:android

# 型チェック
npx tsc --noEmit

# 依存関係の整合性確認
npx expo-doctor
```
