/**
 * PDF テキスト抽出サービス（Phase 2 実装予定）
 *
 * 実装方針:
 *   - expo-document-picker でファイルを選択
 *   - expo-file-system で Base64 読み込み
 *   - Anthropic API に document タイプで直接送信（テキスト抽出不要）
 *
 * 使用例:
 *   const { base64, name } = await pickPdf();
 *   // Anthropic API messages に以下を追加:
 *   {
 *     type: 'document',
 *     source: { type: 'base64', media_type: 'application/pdf', data: base64 }
 *   }
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

type PdfResult = {
  base64: string;
  name: string;
  error?: string;
};

export async function pickPdf(): Promise<PdfResult | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return null;

    const file = result.assets[0];
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { base64, name: file.name };
  } catch (e) {
    return { base64: '', name: '', error: 'PDF の読み込みに失敗しました' };
  }
}
