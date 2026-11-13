import type { AdminConfig } from '@/lib/admin.types';

export const BUILTIN_DANMAKU_API_BASE = 'https://mtvpls-danmu.netlify.app/87654321';
export const BUILTIN_DANMAKU_API_TOKEN = '87654321';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

interface UrlParts {
  path: string;
  query: string;
}

/**
 * 拆分 URL 的路径与查询串（忽略 hash）。
 * 云应用分享地址常形如 https://host/app?sharecode=xxx，
 * 验证参数必须留在最终 URL 末尾，不能夹在 API 路径中间。
 */
function splitUrl(input: string): UrlParts {
  const hashIndex = input.indexOf('#');
  const withoutHash = hashIndex >= 0 ? input.slice(0, hashIndex) : input;
  const queryIndex = withoutHash.indexOf('?');

  if (queryIndex === -1) {
    return { path: trimTrailingSlash(withoutHash), query: '' };
  }

  return {
    path: trimTrailingSlash(withoutHash.slice(0, queryIndex)),
    query: withoutHash.slice(queryIndex + 1),
  };
}

function decodeQueryKey(key: string): string {
  try {
    return decodeURIComponent(key.replace(/\+/g, ' '));
  } catch {
    return key;
  }
}

/** 接口自身参数优先，base 中的验证参数（如 sharecode）追加在末尾且不覆盖同名参数 */
function mergeQuery(endpointQuery: string, baseQuery: string): string {
  const endpointParams = endpointQuery.split('&').filter(Boolean);
  const baseParams = baseQuery.split('&').filter(Boolean);
  const endpointKeys = new Set(
    endpointParams.map((param) => decodeQueryKey(param.split('=')[0]))
  );
  const extraParams = baseParams.filter(
    (param) => !endpointKeys.has(decodeQueryKey(param.split('=')[0]))
  );
  const merged = [...endpointParams, ...extraParams].join('&');
  return merged ? `?${merged}` : '';
}

/**
 * 规范化弹幕 API 地址：只去掉路径末尾的斜杠，保留 sharecode 等查询参数。
 */
export function normalizeDanmakuApiBaseUrl(
  value: string | undefined | null
): string {
  const { path, query } = splitUrl(String(value ?? '').trim());
  return query ? `${path}?${query}` : path;
}

export function getDanmakuApiBaseUrl(siteConfig: AdminConfig['SiteConfig']) {
  if (siteConfig.DanmakuSourceType === 'builtin') {
    return BUILTIN_DANMAKU_API_BASE;
  }

  const { path, query } = splitUrl(
    (siteConfig.DanmakuApiBase || '').trim() || 'http://localhost:9321'
  );
  const token = (siteConfig.DanmakuApiToken || BUILTIN_DANMAKU_API_TOKEN).trim();
  // token 属于路径的一部分，必须加在查询串之前
  const basePath =
    token === BUILTIN_DANMAKU_API_TOKEN ? path : `${path}/${token}`;

  return query ? `${basePath}?${query}` : basePath;
}

/**
 * 构造弹幕上游请求 URL。
 * endpoint 可自带查询串（调用方已完成编码），如 `/api/v2/search/anime?keyword=xxx`；
 * 配置地址中的 sharecode 等验证参数会自动附加到每个请求末尾。
 */
export function buildDanmakuApiUrl(
  siteConfig: AdminConfig['SiteConfig'],
  endpoint: string
): string {
  const { path: basePath, query: baseQuery } = splitUrl(
    getDanmakuApiBaseUrl(siteConfig)
  );
  const { path: endpointPath, query: endpointQuery } = splitUrl(endpoint);
  const fullPath = `${basePath}/${endpointPath.replace(/^\/+/, '')}`;

  return `${fullPath}${mergeQuery(endpointQuery, baseQuery)}`;
}
