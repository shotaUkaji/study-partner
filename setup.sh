#!/bin/bash
# Study Partner — 初回セットアップスクリプト

set -e

echo "📦 依存関係をインストール中..."
npm install

echo "🔧 Expo の設定を確認中..."
npx expo-doctor

echo "📲 ネイティブプロジェクトを生成中（ios/ android/）..."
npx expo prebuild --clean

echo ""
echo "✅ セットアップ完了！"
echo ""
echo "次のコマンドで開発を始められます："
echo "  ./dev.sh                # 実機でビルド・起動（ホットリロード有効）"
echo "  ./dev.sh --simulator    # iOS シミュレーター"
echo ""
echo "Claude Code での開発:"
echo "  claude                  # プロジェクトルートで起動すると CLAUDE.md を読み込みます"
