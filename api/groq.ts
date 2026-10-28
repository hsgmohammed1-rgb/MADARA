// ============================================================
//  MADARA AI — GROQ Backend (Vercel Serverless Function)
//  POST /api/groq  { messages: [{role, content}] }
//
//  نظام التبديل التلقائي (Failover):
//  - يجرب المفتاح 1 → إذا فشل (429 / 401 / 5xx / timeout / شبكة)
//    ينتقل فوراً للمفتاح 2 → ثم 3 — كل هذا بنفس طلب المستخدم.
//  - داخل كل مفتاح يجرب الموديلات بالترتيب.
//  - المفاتيح محفوظة في متغيرات بيئة السيرفر فقط (لا تظهر للمتصفح).
//
//  Environment variables (في Vercel → Settings → Environment Variables):
//    GROQ_API_KEY_1 = gsk_...
//    GROQ_API_KEY_2 = gsk_...
//    GROQ_API_KEY_3 = gsk_...
//  (أو بديل واحد: GROQ_API_KEYS = "gsk_1,gsk_2,gsk_3")
// ============================================================

// نفس نمط api/kick.ts الشغال: Edge Function (يدعم Request/Response القياسية)
export const config = {
  runtime: 'edge',
};

// الموديلات مرتبة من الأفضل للاحتياطي (تم فحصها والتأكد أنها تعمل في 2026)
const MODELS = [
  'openai/gpt-oss-20b',   // الأساسي — سريع + لهجة عربية ممتازة
  'openai/gpt-oss-120b',  // الأذكى — احتياطي أول
  'qwen/qwen3.8-27b',     // احتياطي ثاني
  'allam-2-7b',           // موديل سعودي (SDAIA) — احتياطي أخير
];

function getKeys(): string[] {
  const keys: string[] = [];
  // الطريقة 1: مفاتيح منفصلة
  for (const n of ['1', '2', '3', '4', '5']) {
    const k = process.env[`GROQ_API_KEY_${n}`];
    if (k && k.trim()) keys.push(k.trim());
  }
  // الطريقة 2: سلسلة مفصولة بفواصل
  const combined = process.env.GROQ_API_KEYS || process.env.VITE_GROQ_API_KEYS;
  if (combined) {
    for (const k of combined.split(',')) {
      const t = k.trim();
      if (t && !keys.includes(t)) keys.push(t);
    }
  }
  return keys;
}

async function tryGroq(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
): Promise<{ ok: true; reply: string } | { ok: false; status: number; error: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout لكل محاولة
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, status: res.status, error: errText.slice(0, 300) };
    }

    const data = await res.json();
    const reply: string | undefined = data?.choices?.[0]?.message?.content;
    if (!reply || !reply.trim()) {
      return { ok: false, status: 502, error: 'Empty reply from model' };
    }
    return { ok: true, reply: reply.trim() };
  } catch (e: any) {
    const isTimeout = e?.name === 'AbortError';
    return { ok: false, status: isTimeout ? 504 : 503, error: isTimeout ? 'timeout' : String(e?.message || e).slice(0, 200) };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(request: Request) {
  // CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed, use POST' }, { status: 405 });
  }

  const KEYS = getKeys();
  if (KEYS.length === 0) {
    return Response.json(
      { error: 'No GROQ API keys configured. Add GROQ_API_KEY_1/2/3 in Vercel Environment Variables.' },
      { status: 500 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages array is required' }, { status: 400 });
  }

  // Sanitise: فقط role/content وطول محدود لمنع إساءة الاستخدام
  const clean = messages
    .filter((m: any) => m && typeof m.content === 'string' && ['system', 'user', 'assistant'].includes(m.role))
    .slice(-20)
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, 6000) }));

  if (clean.length === 0) {
    return Response.json({ error: 'No valid messages' }, { status: 400 });
  }

  const attempts: string[] = [];

  // ===== Failover: مفتاح → مفتاح → مفتاح (بنفس اللحظة/الطلب) =====
  for (let k = 0; k < KEYS.length; k++) {
    for (const model of MODELS) {
      const result = await tryGroq(KEYS[k], model, clean);
      if (result.ok === true) {
        const reply = (result as { ok: true; reply: string }).reply;
        return Response.json(
          { reply, model, keyIndex: k + 1 },
          { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } },
        );
      }
      const failed = result as { ok: false; status: number; error: string };
      attempts.push(`key${k + 1}/${model} → ${failed.status} ${failed.error.slice(0, 100)}`);
      console.warn(`[groq] key${k + 1} model ${model} failed: ${failed.status}`);
      // مفتاح خاطئ (401) لا فائدة من تجربة باقي موديلاته — انتقل للمفتاح التالي فوراً
      if (failed.status === 401) break;
    }
  }

  return Response.json(
    { error: 'All GROQ keys/models failed. Try again in a moment.', attempts },
    { status: 502, headers: { 'Access-Control-Allow-Origin': '*' } },
  );
}
