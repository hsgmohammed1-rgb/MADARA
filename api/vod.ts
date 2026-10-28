// Vercel Edge Function — Kick VOD source resolver
// GET /api/vod?uuid={video-uuid} -> { source, private, status }
// Does a cookie handshake + browser headers, then asks Kick's video API
// for the real main video file (m3u8). Public VODs stream natively in-site.

export const config = {
  runtime: 'edge',
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': UA,
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://kick.com/',
  Origin: 'https://kick.com',
  'X-Requested-With': 'XMLHttpRequest',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

function pickCookies(headers: Headers): string {
  try {
    const getSet = (headers as any).getSetCookie?.();
    if (Array.isArray(getSet) && getSet.length) {
      return getSet.map((c: string) => String(c).split(';')[0]).join('; ');
    }
  } catch {}
  try {
    const raw = headers.get('set-cookie') || '';
    if (raw) return raw.split(',').map((c) => c.split(';')[0]).join('; ');
  } catch {}
  return '';
}

async function fetchText(url: string, headers: Record<string, string>, timeoutMs = 9000): Promise<{ status: number; body: string }> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers, signal: c.signal });
    const body = await r.text();
    return { status: r.status, body };
  } finally {
    clearTimeout(t);
  }
}

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url);
  const uuid = (searchParams.get('uuid') || '').trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    return new Response(JSON.stringify({ source: null, error: 'Use /api/vod?uuid={video-uuid}' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1) Cookie handshake like a real browser session
    let cookies = '';
    try {
      const home = await fetch('https://kick.com/', { headers: { 'User-Agent': UA, Accept: 'text/html' } });
      // drain body so the connection can be reused
      await home.arrayBuffer().catch(() => null);
      cookies = pickCookies(home.headers);
    } catch {}

    // 2) Real video file URL from Kick's video API
    const { status, body } = await fetchText(
      `https://kick.com/api/v1/video/${uuid}`,
      cookies ? { ...BROWSER_HEADERS, Cookie: cookies } : BROWSER_HEADERS,
      10000
    );

    if (status === 403) {
      return new Response(JSON.stringify({ source: null, private: true, error: 'subscribers-only' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=300' },
      });
    }
    if (status !== 200) throw new Error(`HTTP ${status}`);

    let j: any = null;
    try {
      j = JSON.parse(body);
    } catch {
      throw new Error('bad json');
    }
    const source = typeof j?.source === 'string' && j.source.includes('.m3u8') ? j.source : null;
    return new Response(
      JSON.stringify({
        source,
        private: j?.is_private === true,
        status: j?.status || null,
        title: j?.livestream?.session_title || null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ source: null, error: err?.message || 'failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=60' },
    });
  }
}
