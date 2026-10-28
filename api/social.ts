// Vercel Edge Function — Live Social Counters API
// GET /api/social?platform=tiktok|instagram|youtube|twitter
// Server-side fetch = no CORS issues, fresh numbers every call.
// Vercel caches success responses for 4 minutes (s-maxage).

export const config = {
  runtime: 'edge',
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const HANDLES = {
  tiktok: 'vmadara9',
  instagram: 'vmadara9',
  twitter: 'vmadara9',
  snapchat: 'vmadara9',
  youtube: 'UCD7EpD4o6bw24c5o5vu4hGQ', // @leveloneclan (Level One clan) — verified UC channel id
} as const;

type Platform = keyof typeof HANDLES;

async function fetchJson(url: string, timeoutMs = 7000, extraHeaders: Record<string, string> = {}): Promise<any> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', ...extraHeaders },
      signal: c.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function fetchText(url: string, timeoutMs = 7000): Promise<string> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: c.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

/** "68,337" | "68.3K" | "1.2M" -> 68337 */
function parseCompact(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return Math.round(input);
  const s = String(input ?? '').replace(/,/g, '').trim();
  const m = s.match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const u = (m[2] || '').toUpperCase();
  if (u === 'K') n *= 1e3;
  else if (u === 'M') n *= 1e6;
  else if (u === 'B') n *= 1e9;
  const out = Math.round(n);
  return out > 0 ? out : null;
}

/** Extract "N followers" from mirror HTML — tags stripped, anchored on hearts stat. */
function extractFollowerCount(html: string): number | null {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ');
  const m =
    text.match(/hearts\s+([\d.,]+)\s*([KMB])?\s+followers/i) ||
    text.match(/([\d.,]+)\s*([KMB])?\s+followers/i);
  if (!m) return null;
  let v = parseFloat(m[1].replace(/,/g, ''));
  const u = (m[2] || '').toUpperCase();
  if (u === 'K') v *= 1e3;
  else if (u === 'M') v *= 1e6;
  else if (u === 'B') v *= 1e9;
  if (!Number.isFinite(v)) return null;
  const out = Math.round(v);
  return out > 0 ? out : null;
}

async function getTikTok(): Promise<{ count: number; source: string }> {
  const target = `https://urlebird.com/user/${HANDLES.tiktok}/`;
  const notes: string[] = [];
  const fail = (tag: string, e: any) =>
    notes.push(`${tag}:${String(e?.message || e).replace(/^HTTP (\d+).*/, 'HTTP$1').slice(0, 40)}`);
  // 0) Urlebird mirror — verified working, real profile stats (e.g. 27.17K followers)
  try {
    const n = extractFollowerCount(await fetchText(target, 7000));
    if (n) return { count: n, source: 'urlebird' };
    notes.push('urlebird-direct:no-match');
  } catch (e) { fail('urlebird-direct', e); }
  // 1) Same page via Google Translate proxy (Google egress IPs are rarely walled)
  try {
    const html = await fetchText(
      `https://urlebird-com.translate.goog/user/${HANDLES.tiktok}/?_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=en`,
      8000
    );
    const n = extractFollowerCount(html);
    if (n) return { count: n, source: 'urlebird-google' };
    notes.push('urlebird-google:no-match');
  } catch (e) { fail('urlebird-google', e); }
  // 2) Same page via AllOrigins (different egress IP + CORS-open)
  try {
    const proxied = await fetchText(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
      8000
    );
    const n = extractFollowerCount(proxied);
    if (n) return { count: n, source: 'urlebird-proxy' };
    notes.push('urlebird-proxy:no-match');
  } catch (e) { fail('urlebird-proxy', e); }
  throw new Error(`tiktok: all failed [${notes.join(' | ')}]`);
}

async function getYouTube(): Promise<{ count: number; source: string }> {
  // 0) Resolve @handle -> UC channel id (cached per isolate)
  const id = (await resolveYouTubeId()) || (HANDLES.youtube.startsWith('UC') ? HANDLES.youtube : null);
  if (!id) throw new Error('youtube: could not resolve channel id');
  // 1) Mixerno — exact subscriber count
  try {
    const d = await fetchJson(`https://mixerno.space/api/youtube-channel-counter/user/${id}`);
    const entry = Array.isArray(d?.counts) ? d.counts.find((c: any) => c?.value === 'subscribers') : null;
    const n = parseCompact(entry?.count);
    if (n) return { count: n, source: 'mixerno' };
  } catch {}
  // 2) Piped
  try {
    const d = await fetchJson(`https://pipedapi.kavin.rocks/channel/${id}`);
    const n = parseCompact(d?.subscriberCount);
    if (n) return { count: n, source: 'piped' };
  } catch {}
  throw new Error('youtube: all sources failed');
}

async function getTwitter(): Promise<{ count: number; source: string }> {
  // 1) FixTweet — exact followers
  try {
    const d = await fetchJson(`https://api.fxtwitter.com/${HANDLES.twitter}`);
    const n = parseCompact(d?.user?.followers);
    if (n) return { count: n, source: 'fxtwitter' };
  } catch {}
  // 2) X syndication endpoint
  try {
    const d = await fetchJson(
      `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${HANDLES.twitter}`
    );
    const n = parseCompact(Array.isArray(d) ? d[0]?.followers_count : d?.followers_count);
    if (n) return { count: n, source: 'syndication' };
  } catch {}
  throw new Error('twitter: all sources failed');
}

async function getInstagram(): Promise<{ count: number; source: string }> {
  // 1) Instagram web API with public app id (works server-side with proper headers)
  try {
    const d = await fetchJson(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${HANDLES.instagram}`, 7000, {
      'X-IG-App-ID': '936619743392459',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `https://www.instagram.com/${HANDLES.instagram}/`,
    });
    const n = parseCompact(d?.data?.user?.edge_followed_by?.count);
    if (n) return { count: n, source: 'web_profile_info' };
  } catch {}
  // 2) Mixerno — dedicated Instagram counter (works from browsers)
  try {
    const d = await fetchJson(`https://mixerno.space/api/instagram-user-counter/user/${HANDLES.instagram}`);
    const entry = Array.isArray(d?.counts) ? d.counts.find((c: any) => /follow/i.test(c?.value || '')) : null;
    const n = parseCompact(entry?.count);
    if (n) return { count: n, source: 'mixerno' };
  } catch {}
  // 3) og:description meta ("21.3K Followers, ...")
  try {
    const html = await fetchText(`https://www.instagram.com/${HANDLES.instagram}/`);
    const og = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1] || '';
    const m = og.match(/([\d.,]+[KMB]?)\s+Followers/i);
    const n = m ? parseCompact(m[1]) : null;
    if (n) return { count: n, source: 'og_description' };
  } catch {}
  throw new Error('instagram: all sources failed (login-walled)');
}

/** Resolve a YouTube @handle to its UC channel id (cached). */
let YT_CHANNEL_ID: string | null = null;

async function resolveYouTubeId(): Promise<string | null> {
  if (YT_CHANNEL_ID) return YT_CHANNEL_ID;
  if (HANDLES.youtube.startsWith('UC')) {
    YT_CHANNEL_ID = HANDLES.youtube;
    return YT_CHANNEL_ID;
  }
  // YouTube serves a consent wall to datacenters — bypass with CONSENT cookie
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 7000);
    const r = await fetch(`https://www.youtube.com/@${HANDLES.youtube.replace(/^@/, '')}/`, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml',
        Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+667; SOCS=CAESEwgDEgk0OTE3MjQ1ODg',
      },
      signal: c.signal,
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const html = await r.text();
    const m =
      html.match(/"channelId":"(UC[\w-]{22})"/) ||
      html.match(/youtube\.com\/channel\/(UC[\w-]{22})/) ||
      html.match(/"browseId":"(UC[\w-]{22})"/);
    if (m) {
      YT_CHANNEL_ID = m[1];
      return YT_CHANNEL_ID;
    }
  } catch {}
  return null;
}

async function getSnapchat(): Promise<{ count: number; source: string }> {
  // Snapchat has no official public API — best-effort scrape of the public profile page
  try {
    const html = await fetchText(`https://www.snapchat.com/add/${HANDLES.snapchat}`);
    const m =
      html.match(/"subscriberCount"\s*:\s*"?(\d[\d,.]*)"?/) ||
      html.match(/([\d.,]+[KMB]?)\s+Subscribers?/i);
    const n = m ? parseCompact(m[1]) : null;
    if (n) return { count: n, source: 'profile_page' };
  } catch {}
  throw new Error('snapchat: no public counter available');
}

/** Latest YouTube upload — parses the public RSS feed directly (no middleman). */
async function getYouTubeLatest(channelId: string): Promise<{ title: string; link: string; date: string; thumbnail: string } | null> {
  try {
    const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, 9000);
    const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/i)?.[1];
    if (!entry) return null;
    const unesc = (s: string) =>
      s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
    const vid = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1]?.trim() || '';
    const title = unesc(entry.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || 'Latest video');
    const link = entry.match(/<link[^>]*href="([^"]+)"/i)?.[1] || (vid ? `https://www.youtube.com/watch?v=${vid}` : '');
    const date = entry.match(/<published>([^<]+)<\/published>/i)?.[1] || '';
    if (!link) return null;
    return { title, link, date, thumbnail: vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : '' };
  } catch {
    return null;
  }
}

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = (searchParams.get('platform') || '').toLowerCase() as Platform;

  if (!platform || !(platform in HANDLES)) {
    return new Response(JSON.stringify({ error: 'Use ?platform=tiktok|instagram|youtube|twitter|snapchat' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const loaders: Record<Platform, () => Promise<{ count: number; source: string }>> = {
      tiktok: getTikTok,
      instagram: getInstagram,
      youtube: getYouTube,
      twitter: getTwitter,
      snapchat: getSnapchat,
    };
    const { count, source } = await loaders[platform]();
    const extra: Record<string, unknown> = {};
    if (platform === 'youtube') {
      const channelId = (await resolveYouTubeId()) || (HANDLES.youtube.startsWith('UC') ? HANDLES.youtube : null);
      if (channelId) {
        extra.channelId = channelId;
        const latest = await getYouTubeLatest(channelId);
        if (latest) extra.latest = latest;
      }
    }
    return new Response(JSON.stringify({ platform, count, source, ...extra, updatedAt: new Date().toISOString() }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=240, stale-while-revalidate=600',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ platform, count: null, error: err?.message || 'failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=60' },
    });
  }
}
