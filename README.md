# Study Partner

> 調べごとコンサル型 AI ラーニングアプリ

疑問を持ち込むと、AI がソクラテス式の問いかけでコンテンツを一緒に読み解いてくれます。
URL・PDF・テキストをソースに、深く考えるための対話を。

---

## スクリーンショット

<!-- TODO: スクリーンショットを追加 -->

---

## 機能

- **URL / PDF / テキスト** をソースとして調べごとを開始
- **ソクラテス式 AI チャット** — 答えを与えるのではなく、問いかけで思考を深める
- **AI 理解マップ自動生成** — 「わかったこと」「まだ曖昧なこと」「次に調べること」の 3 軸で整理
- **自分のメモ** — 気づきをその場で記録
- **Safari Share Extension** — ブラウザから URL を直接シェア

---

## 技術スタック

| 領域 | 技術 |
|---|---|
| フレームワーク | React Native + Expo SDK 52 |
| ナビゲーション | Expo Router v4 |
| 状態管理 | Zustand v5 |
| ローカル DB | expo-sqlite v15 |
| AI | Anthropic API（Claude Sonnet） |
| URL 取得 | Jina AI Reader |
| スタイリング | NativeWind（Tailwind for RN） |

---

## セットアップ

### 必要なもの

- Node.js 20+
- Xcode（iOS ビルド用）
- [Anthropic API キー](https://console.anthropic.com/)

### インストール

```bash
git clone https://github.com/shotaUkaji/study-partner.git
cd study-partner
./setup.sh
```

### 開発サーバー起動

```bash
# 実機（USB 接続）
./dev.sh

# iOS シミュレーター
./dev.sh --simulator
```

アプリ起動後、設定タブから Anthropic API キーを入力してください。

---

## ライセンス

MIT
