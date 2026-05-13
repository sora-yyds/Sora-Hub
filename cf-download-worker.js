/**
 * SORA-HUB 下载代理 Cloudflare Worker
 *
 * 功能：代替用户浏览器请求 dev-c.com 文件，绕过防盗链
 * 部署：Cloudflare Dashboard → Workers → 创建 → 粘贴此代码
 *
 * 免费额度：100,000 请求/天，10GB 出站带宽/月
 *
 * 用法：GET https://你的worker.dev/?u=<base64编码的目标URL>
 */

// ==================== 配置 ====================
// 允许调用此 Worker 的域名（你的网站）
const ALLOWED_ORIGINS = [
  'https://sorahub.s-o-r-a.top',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
];

// 允许下载的目标域名白名单
const ALLOWED_HOSTS = ['www.dev-c.com', 'dev-c.com'];

// 允许的文件扩展名
const ALLOWED_EXTENSIONS = ['.zip'];

// CORS 头
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const url = new URL(request.url);

      // 调试模式
      if (url.searchParams.has('debug')) {
        return jsonResponse({
          ok: true,
          worker: true,
          free_tier: '100,000 requests/day, 10GB bandwidth/month',
          allowed_hosts: ALLOWED_HOSTS,
        });
      }

      // ====== 来源校验（fetch 请求会携带 Origin 头） ======
      const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
      const originHost = (() => {
        try { return new URL(origin).hostname; } catch { return ''; }
      })();
      const allowedHostnames = ALLOWED_ORIGINS.map(o => { try { return new URL(o).hostname; } catch { return ''; } });

      if (!allowedHostnames.includes(originHost)) {
        return jsonResponse({
          ok: false,
          error: '来源域名不允许',
          your_origin: origin || '(无)',
        }, 403);
      }

      // ====== 解析目标 URL ======
      const encoded = url.searchParams.get('u') || '';
      if (!encoded) {
        return jsonResponse({ ok: false, error: '缺少参数 u（Base64 编码的下载地址）' }, 400);
      }

      let targetUrl;
      try {
        targetUrl = atob(encoded);
      } catch {
        return jsonResponse({ ok: false, error: 'Base64 解码失败' }, 400);
      }

      // ====== 安全校验 ======
      let parsed;
      try {
        parsed = new URL(targetUrl);
      } catch {
        return jsonResponse({ ok: false, error: '无效的 URL' }, 400);
      }

      if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
        return jsonResponse({
          ok: false,
          error: `域名 ${parsed.hostname} 不在白名单中`,
          allowed: ALLOWED_HOSTS,
        }, 403);
      }

      const ext = parsed.pathname.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(`.${ext}`)) {
        return jsonResponse({ ok: false, error: `仅允许下载 ${ALLOWED_EXTENSIONS.join(', ')} 文件` }, 403);
      }

      // ====== 代理请求 ======
      const resp = await fetch(targetUrl, {
        headers: {
          'Referer': 'http://www.dev-c.com/gtav/scripthookv/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
        redirect: 'follow',
      });

      if (!resp.ok) {
        return jsonResponse({
          ok: false,
          error: `目标服务器返回 HTTP ${resp.status}`,
          target: targetUrl,
        }, 502);
      }

      // ====== 流式返回文件 ======
      const filename = parsed.pathname.split('/').pop() || 'download.zip';
      const headers = new Headers(CORS_HEADERS);
      headers.set('Content-Type', 'application/octet-stream');
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      headers.set('Cache-Control', 'public, max-age=86400'); // CDN 可缓存 24 小时

      // 转发 Content-Length（如果有的话）
      const contentLength = resp.headers.get('Content-Length');
      if (contentLength) {
        headers.set('Content-Length', contentLength);
      }

      return new Response(resp.body, { headers });

    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500);
    }
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
