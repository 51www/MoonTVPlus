import type { AdminConfig } from './admin.types';
import {
  buildDanmakuApiUrl,
  getDanmakuApiBaseUrl,
  normalizeDanmakuApiBaseUrl,
} from './config';

function makeSite(
  overrides: Partial<AdminConfig['SiteConfig']> = {}
): AdminConfig['SiteConfig'] {
  return {
    DanmakuSourceType: 'custom',
    DanmakuApiBase: 'http://localhost:9321',
    DanmakuApiToken: '87654321',
    ...overrides,
  } as AdminConfig['SiteConfig'];
}

describe('弹幕 API 地址兼容带查询参数的云应用服务', () => {
  it('普通地址行为保持不变', () => {
    expect(
      buildDanmakuApiUrl(
        makeSite(),
        '/api/v2/search/anime?keyword=%E9%AC%BC%E7%81%AD'
      )
    ).toBe(
      'http://localhost:9321/api/v2/search/anime?keyword=%E9%AC%BC%E7%81%AD'
    );
    expect(buildDanmakuApiUrl(makeSite(), '/api/v2/match')).toBe(
      'http://localhost:9321/api/v2/match'
    );
  });

  it('sharecode 等验证参数自动附加到每个请求，且不破坏 API 路径', () => {
    const site = makeSite({
      DanmakuApiBase:
        'https://danmu.example.workbuddy.cn/app?sharecode=abc123',
    });

    expect(
      buildDanmakuApiUrl(site, '/api/v2/search/anime?keyword=test')
    ).toBe(
      'https://danmu.example.workbuddy.cn/app/api/v2/search/anime?keyword=test&sharecode=abc123'
    );
    expect(buildDanmakuApiUrl(site, '/api/v2/match')).toBe(
      'https://danmu.example.workbuddy.cn/app/api/v2/match?sharecode=abc123'
    );
    expect(
      buildDanmakuApiUrl(
        site,
        '/api/v2/comment?url=https%3A%2F%2Fv.example%2Fa.m3u8&format=xml'
      )
    ).toBe(
      'https://danmu.example.workbuddy.cn/app/api/v2/comment?url=https%3A%2F%2Fv.example%2Fa.m3u8&format=xml&sharecode=abc123'
    );
  });

  it('自定义 token 仍拼接在路径上，位于查询串之前', () => {
    const site = makeSite({
      DanmakuApiBase: 'https://host/app/?sharecode=a&foo=b',
      DanmakuApiToken: 'my-token',
    });

    expect(getDanmakuApiBaseUrl(site)).toBe(
      'https://host/app/my-token?sharecode=a&foo=b'
    );
    expect(buildDanmakuApiUrl(site, '/api/v2/bangumi/42')).toBe(
      'https://host/app/my-token/api/v2/bangumi/42?sharecode=a&foo=b'
    );
  });

  it('base 中的同名参数不覆盖接口自身参数', () => {
    const site = makeSite({
      DanmakuApiBase: 'https://host?sharecode=a&format=json',
    });

    expect(buildDanmakuApiUrl(site, '/api/v2/comment/1?format=xml')).toBe(
      'https://host/api/v2/comment/1?format=xml&sharecode=a'
    );
  });

  it('规范化保留查询串，仅去掉路径末尾斜杠', () => {
    expect(
      normalizeDanmakuApiBaseUrl(' https://host/app/?sharecode=a#frag ')
    ).toBe('https://host/app?sharecode=a');
    expect(
      normalizeDanmakuApiBaseUrl('https://host/app?sharecode=a/')
    ).toBe('https://host/app?sharecode=a/');
    expect(normalizeDanmakuApiBaseUrl('')).toBe('');
  });

  it('内置源忽略自定义地址中的验证参数', () => {
    const site = makeSite({
      DanmakuSourceType: 'builtin',
      DanmakuApiBase: 'https://host?sharecode=a',
    });

    expect(buildDanmakuApiUrl(site, '/api/v2/match')).toBe(
      'https://mtvpls-danmu.netlify.app/87654321/api/v2/match'
    );
  });
});
