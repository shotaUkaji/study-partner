const JINA_BASE = 'https://r.jina.ai/';
const MAX_CONTENT_LENGTH = 50000;
const FETCH_TIMEOUT_MS = 15000;

type FetchResult = {
  content: string;
  error?: string;
};

export async function fetchUrlContent(url: string): Promise<FetchResult> {
  try {
    const jinaUrl = `${JINA_BASE}${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(jinaUrl, {
      headers: { Accept: 'text/plain' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      return { content: '', error: `URL の取得に失敗しました（${response.status}）` };
    }

    let text = await response.text();

    // 長すぎる場合はトリミング
    if (text.length > MAX_CONTENT_LENGTH) {
      text = text.slice(0, MAX_CONTENT_LENGTH) + '\n\n[コンテンツが長いため省略されました]';
    }

    return { content: text };
  } catch (e: unknown) {
    const isTimeout = e instanceof Error && e.name === 'AbortError';
    return { content: '', error: isTimeout ? 'URL の取得がタイムアウトしました（15秒）' : 'URL の取得中にエラーが発生しました' };
  }
}

export function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}
