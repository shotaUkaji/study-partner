#!/bin/bash
# Study Partner — 開発用起動スクリプト
# 使い方: ./dev.sh [--simulator]
#   --simulator : 実機ではなく iOS シミュレーターで起動

set -e

SIMULATOR=false
for arg in "$@"; do
  case $arg in
    --simulator) SIMULATOR=true ;;
  esac
done

echo "🔍 環境チェック中..."

# node_modules が無ければインストール
if [ ! -d "node_modules" ]; then
  echo "📦 依存関係をインストール中..."
  npm install
fi

# 既存の Metro プロセスを終了
pkill -f "expo start" 2>/dev/null || true
pkill -f "metro"      2>/dev/null || true

echo ""

if [ "$SIMULATOR" = true ]; then
  echo "📱 iOS シミュレーターでビルド・起動します（ホットリロード有効）"
  npx expo run:ios
else
  # Mac の WiFi IP を取得（物理デバイスから localhost には届かないため）
  HOST_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")

  if [ -z "$HOST_IP" ]; then
    echo "⚠️  WiFi の IP アドレスを取得できませんでした。Mac と iPhone が同じ WiFi に接続されているか確認してください。"
    echo "📱 実機でビルド・起動します（ホットリロード有効）"
  else
    echo "📱 実機でビルド・起動します（ホットリロード有効）"
    echo "   Metro アドレス: http://${HOST_IP}:8081"
    export EXPO_DEVSERVER_HOST="$HOST_IP"
  fi

  echo "   デバイスを USB 接続して信頼済みにしてください"
  echo ""
  npx expo run:ios --device
fi
