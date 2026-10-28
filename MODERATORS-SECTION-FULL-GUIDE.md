# 🛡️ قسم المشرفين — التوثيق الكامل | MODERATORS SECTION

> **الملف الأساسي:** `components/ModeratorsSection.tsx` (313 سطر)
> **الربط:** `App.tsx` — قسم `#moderators` + عنوان `المشرفون / Moderators`
> **مصدر البيانات الحية:** منصة **X (تويتر سابقاً)** عبر **FixTweet API** — `https://api.fxtwitter.com/{handle}`
> **عدد المشرفين:** **11 مشرف** — 1 قائد (BOSS) + 10 مشرفين (GRID)
> **اللغات:** عربي + إنجليزي — `ar / en`
> **بدون تعديل على الكود** — هذا الملف شرح وتوثيق فقط.

---

## 📑 الفهرس

1. [الفكرة العامة للقسم](#1-️-الفكرة-العامة-للقسم)
2. [قائمة المشرفين الـ 11](#2--قائمة-المشرفين-الـ-11-kick--x)
3. [استخراج المعلومات من X — كيف يعمل؟](#3--استخراج-المعلومات-من-x--كيف-يعمل)
4. [معمارية الجلب — 3 طبقات + كاش + دفعات](#4--معمارية-الجلب--3-طبقات--كاش--دفعات)
5. [التصميم الكامل — BOSS HERO + MODS GRID](#5--التصميم-الكامل--boss-hero--mods-grid)
6. [الألوان والهوية البصرية](#6--الألوان-والهوية-البصرية)
7. [الأيقونات SVG الخاصة بالقسم](#7-️-الأيقونات-svg-الخاصة-بالقسم)
8. [الربط في `App.tsx` — أين يظهر القسم؟](#8--الربط-في-apptsx--أين-يظهر-القسم)
9. [شرح الكود سطر بسطر](#9--شرح-الكود-سطر-بسطر)
10. [الكود الكامل للقسم (نسخ ولصق)](#10--الكود-الكامل-للقسم-نسخ-ولصق)
11. [الترجمة العربية / الإنجليزية](#11--الترجمة-العربية--الإنجليزية)
12. [الأداء والكاش والتحديث التلقائي](#12--الأداء-والكاش-والتحديث-التلقائي)
13. [التجاوب مع الجوال والشاشات](#13--التجاوب-مع-الجوال-والشاشات)
14. [كيف تضيف / تحذف / تغيّر القائد؟](#14--كيف-تضيف--تحذف--تغيّر-القائد)
15. [الأخطاء الشائعة والحلول](#15--الأخطاء-الشائعة-والحلول)
16. [ملخص سريع للمطور](#16--ملخص-سريع-للمطور)

---

## 1- 💡 الفكرة العامة للقسم

قسم **المشرفون** هو قسم تعريفي يعرض فريق إشراف قناة **Firas على Kick**، لكن كل بطاقة تُغذَّى **مباشرة من حساب المشرف على X**.

كل مشرف عنده هويتين مربوطتين ببعض:

```
KICK (اسم القناة على Kick)  ←→  X (يوزر تويتر)
مثال: kick: A7MEDO  ←→  x: _A7MEDO_
```

القسم مقسوم بصرياً إلى جزأين:

| الجزء | الوصف | لمن؟ |
|---|---|---|
| **👑 BOSS HERO** | بطاقة كبيرة فاخرة بإطار أزرق متدرج + تاج + بانر + أفاتار ضخم | المشرف الأول `A7MEDO` |
| **🛡️ MODS GRID** | شبكة بطاقات `1 / 2 / 3` أعمدة حسب الشاشة | باقي الـ 10 مشرفين |

> **الفلسفة:** القائد مميز أزرقاً في الأعلى، والفريق تحته ببطاقات زجاجية موحدة — إحساس هرمي فخم (Citadel / Ice Luxury).

---

## 2- 👥 قائمة المشرفين الـ 11 (Kick + X)

هذا هو الـ `ROSTER` الحقيقي من الكود — **لا يوجد جلب من سيرفر خاص، القائمة ثابتة والبيانات الحية من X فقط**:

| # | Kick | X (الرابط) | الدور |
|---|---|---|---|
| 1 | `A7MEDO` | [@_A7MEDO_](https://x.com/_A7MEDO_) | 👑 **BOSS / القائد** |
| 2 | `iiiBADR` | [@1liBadr](https://x.com/1liBadr) | مشرف |
| 3 | `JustN2sr` | [@JustN2sr](https://x.com/JustN2sr) | مشرف |
| 4 | `llHMD` | [@1HHMMDD](https://x.com/1HHMMDD) | مشرف |
| 5 | `2Yaseer` | [@ieY52](https://x.com/ieY52) | مشرف |
| 6 | `M0ATAZ` | [@S7_Moataz](https://x.com/S7_Moataz) | مشرف |
| 7 | `Alghamdiz` | [@S7le_A](https://x.com/S7le_A) | مشرف |
| 8 | `xAREEJ1` | [@itsxAREEJ1](https://x.com/itsxAREEJ1) | مشرف |
| 9 | `uANWAR` | [@_pnj8](https://x.com/_pnj8) | مشرف |
| 10 | `MISK_RY` | [@MISK_RY](https://x.com/MISK_RY) | مشرف |
| 11 | `7rema` | [@7reml4](https://x.com/7reml4) | مشرف |

تعريفها في الكود:

```ts
interface RosterEntry {
  kick: string;
  x: string;
  boss?: boolean;
}

// 11 moderators — Kick name + X handle (live data via FixTweet)
const ROSTER: RosterEntry[] = [
  { kick: 'A7MEDO', x: '_A7MEDO_', boss: true },
  { kick: 'iiiBADR', x: '1liBadr' },
  { kick: 'JustN2sr', x: 'JustN2sr' },
  { kick: 'llHMD', x: '1HHMMDD' },
  { kick: '2Yaseer', x: 'ieY52' },
  { kick: 'M0ATAZ', x: 'S7_Moataz' },
  { kick: 'Alghamdiz', x: 'S7le_A' },
  { kick: 'xAREEJ1', x: 'itsxAREEJ1' },
  { kick: 'uANWAR', x: '_pnj8' },
  { kick: 'MISK_RY', x: 'MISK_RY' },
  { kick: '7rema', x: '7reml4' },
];
```

> ملاحظة: `boss: true` موجودة شكلياً على الأول، لكن الكود فعلياً يعتبر `ROSTER[0]` هو القائد:
> `const boss = ROSTER[0]; const rest = ROSTER.slice(1);`

---

## 3- 🐦 استخراج المعلومات من X — كيف يعمل؟

### 3.1 ما هي FixTweet؟

بدل استخدام Twitter API الرسمي (يحتاج مفاتيح مدفوعة)، القسم يستخدم خدمة **FixTweet / FxTwitter** المجانية:

```
https://api.fxtwitter.com/{handle}
```

مثال حي:

```
https://api.fxtwitter.com/_A7MEDO_
```

الرد يكون JSON فيه كائن `user` فيه كل شيء:

```json
{
  "user": {
    "name": "اسم العرض",
    "screen_name": "_A7MEDO_",
    "avatar_url": "https://..._normal.jpg",
    "banner_url": "https://.../profile_banner",
    "description": "البايو...",
    "followers": 1234,
    "tweets": 567
  }
}
```

### 3.2 ماذا نستخرج بالضبط؟

دالة `fetchMod(handle)` تحوّل رد FixTweet إلى كائن نظيف `ModProfile`:

```ts
interface ModProfile {
  name: string;       // اسم العرض من X
  handle: string;     // اليوزر بدون @
  avatar: string;     // صورة البروفايل بدقة 400x400
  banner: string;     // صورة الغلاف بمقاس 1500x500
  bio: string;        // النبذة
  followers: number | null;
  tweets: number | null;
  live: boolean;      // true = البيانات حية من X ، false = fallback
}
```

أهم سطرين للصور:

```ts
// _normal. → _400x400. يعطي صورة أوضح 4 أضعاف
avatar: avatarRaw ? avatarRaw.replace('_normal.', '_400x400.') : '',
// إضافة /1500x500 يعطي بانر عريض كامل
banner: bannerRaw ? `${bannerRaw}/1500x500` : '',
```

### 3.3 دالة الجلب الكاملة

```ts
async function fetchJson(url: string, timeoutMs = 10000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Layer 1: our server proxy (no CORS issues) → Layer 2: direct FixTweet → Layer 3: static fallback
async function fetchMod(handle: string): Promise<ModProfile | null> {
  const target = `https://api.fxtwitter.com/${handle}`;
  let user: any = null;
  try {
    const via = await fetchJson('/api/kick?endpoint=' + encodeURIComponent(target));
    user = via?.user || null;
  } catch { /* fall through */ }
  if (!user) {
    try {
      const direct = await fetchJson(target);
      user = direct?.user || null;
    } catch { /* fall through */ }
  }
  if (!user) return null;
  // ... تحويل user إلى ModProfile كما بالأعلى
}
```

---

## 4- 🏗️ معمارية الجلب — 3 طبقات + كاش + دفعات

```
┌──────────────────────────────────────────────┐
│ Layer 1: Proxy الخاص بك                      │
│ /api/kick?endpoint=https://api.fxtwitter...  │
│ (ملف api/kick.ts — Vercel Edge Function)     │
│ → يحل مشكلة CORS + كاش سيرفر دقيقة           │
└──────────────┬───────────────────────────────┘
               │ فشل؟
               ▼
┌──────────────────────────────────────────────┐
│ Layer 2: مباشر من المتصفح                   │
│ fetch('https://api.fxtwitter.com/handle')    │
│ timeout 10 ثواني لكل طلب                     │
└──────────────┬───────────────────────────────┘
               │ فشل؟
               ▼
┌──────────────────────────────────────────────┐
│ Layer 3: Fallback ثابت                       │
│ { name: kick, handle: x, avatar:'', ... }    │
│ live: false — يظهر الحرف الأول + ---         │
└──────────────────────────────────────────────┘
```

### البروكسي `api/kick.ts`

```ts
// Vercel Edge Function — بروكسي سريع وخاص بموقعك
export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  if (!endpoint) return new Response(JSON.stringify({ error: 'Endpoint is required' }), { status: 400 });
  const apiResponse = await fetch(endpoint, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 ... Chrome/120.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  const data = await apiResponse.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
    },
  });
}
```

### الدفعات — 3 في كل مرة

حتى لا نضغط على API، الطلبات تُرسل **3 × 3 × 3 × 2**:

```ts
for (let i = 0; i < ROSTER.length; i += 3) {
  const batch = await Promise.all(
    ROSTER.slice(i, i + 3).map(async (m) => {
      try { return await fetchMod(m.x); }
      catch { return null; }
    })
  );
  // تحديث تدريجي للشاشة بعد كل دفعة — البطاقات تظهر وهي تُحمّل
  setProfiles((prev) => ({ ...prev, ...next }));
}
```

---

## 5- 🎨 التصميم الكامل — BOSS HERO + MODS GRID

### 5.1 شريط المزامنة العلوي (Sync Bar)

أول ما يفتح القسم يظهر خط رفيع يلمع أثناء جلب بيانات X ويختفي بعدها:

```tsx
<div className={`h-[2px] w-full overflow-hidden rounded-full bg-white/[0.06] mb-4 md:mb-6 transition-opacity duration-700 ${loading ? 'opacity-100' : 'opacity-0'}`}>
  <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#4D8DFF] to-transparent animate-pulse" />
</div>
```

### 5.2 👑 BOSS HERO — بطاقة القائد A7MEDO

**الهيكل البصري من الخارج للداخل:**

```
┌─ إطار خارجي: p-[1.5px] + gradient أزرق + ظل 90px ─────────┐
│ ┌─ جسم أسود #080808 rounded-[26.5px] ───────────────────┐ │
│ │ [بانر h-36/48/56 + تدرج أسود سفلي + زر X عائم]        │ │
│ │ [أفاتار 20/24 + حلقة conic أزرقة + توهج + تاج 👑]     │ │
│ │ [الاسم كبير + @handle أخضر + KICK: ...]               │ │
│ │ [عدّادين: متابعين أزرق + منشورات أبيض]               │ │
│ │ [البايو max-w-3xl]                                    │ │
│ │ [زرّين: Follow أبيض + Kick أخضر]                      │ │
│ │ [خط أزرق علوي h-px]                                   │ │
│ └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

**أهم أسطر التصميم:**

```tsx
// الإطار الأزرق الخارجي
<div className="relative rounded-[28px] p-[1.5px] bg-gradient-to-b from-[#D6E9FF] via-[#4D8DFF]/50 to-transparent shadow-[0_30px_90px_rgba(201,162,75,0.25)] mb-4 md:mb-6 overflow-hidden">
  <div className="relative rounded-[26.5px] bg-[#080808] overflow-hidden">

// حلقة الأفاتار الأزرقة الدوّارة (conic)
<span className="relative rounded-full p-[3px] w-20 h-20 sm:w-24 sm:h-24 shrink-0"
  style={{ background: 'conic-gradient(from 200deg,#9cc5ff,#12315e,#eaf4ff,#12315e,#9cc5ff)',
           boxShadow: '0 0 44px rgba(255,215,106,0.55)' }}>

// التاج العائم فوق الأفاتار
<CrownIcon className="absolute -top-5 left-1/2 -translate-x-1/2 w-7 h-7 text-[#9CC5FF] drop-shadow-[0_0_10px_rgba(255,215,106,0.9)] animate-float-soft" />

// عدّاد المتابعين
<span className="inline-flex flex-col items-center px-4 py-2 rounded-2xl bg-[#D6E9FF]/10 border border-[#D6E9FF]/30">
  <span className="text-base sm:text-lg font-black text-[#D6E9FF]">{compact(bossP.followers)}</span>
```

**الأزرار:**

| الزر | الشكل | الرابط |
|---|---|---|
| `Follow @handle` | أبيض `bg-white text-black` + أيقونة X | `https://x.com/{x}` |
| `Kick` | زجاجي + حدود بيضاء، hover أخضر | `https://kick.com/{kick}` |

### 5.3 🛡️ MODS GRID — شبكة الـ 10 مشرفين

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
```

كل بطاقة:

```
┌─ rounded-[22px] border white/10 bg-white/[0.03] backdrop-blur ─┐
│ [بانر h-20/24 + شارة 🛡️ مشرف/MOD + زر X]                      │
│ [أفاتار 14 + حلقة أزرقة + نقطة خضراء ● إن live]               │
│ [الاسم + @handle + KICK: ...]                                  │
│ [البايو سطرين line-clamp-2 أو ---]                             │
│ [متابعين + زر Follow + زر Kick مربع]                           │
│ [خط سفلي أزرق يتمدد عند hover w-0 → w-full]                    │
└───────────────────────────────────────────────────────────────┘
```

**تفاعلات hover (أهم ما يميز البطاقة):**

```tsx
className="group relative rounded-[22px] border border-white/10 bg-white/[0.03]
  backdrop-blur-xl overflow-hidden
  hover:border-[#4D8DFF]/50        /* الحدود تصبح أزرقة */
  hover:-translate-y-1             /* ترتفع 4px */
  hover:shadow-[0_24px_60px_-16px_rgba(201,162,75,0.35)]  /* ظل أزرق */
  transition-all duration-300"
```

**الدخول المتدرج:** كل بطاقة تتأخر عن التي قبلها 60ms:

```tsx
style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
// 0ms, 60ms, 120ms ... حتى 480ms كحد أقصى
```

**النقطة الخضراء (مؤشر البيانات الحية):**

```tsx
{p.live && <span className="absolute bottom-0 end-0 w-3.5 h-3.5 rounded-full bg-[#9CC5FF] border-2 border-[#0b0b0b] shadow-[0_0_10px_#9CC5FF]" />}
```

**الخط السفلي المتحرك:**

```tsx
<span className="absolute bottom-0 start-0 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-[#D6E9FF] to-[#4D8DFF] transition-all duration-500" />
```

---

## 6- 🎨 الألوان والهوية البصرية

القسم يتبع هوية الموقع الأزرقة **Citadel Ice** — نفس ألوان الشعار:

| اللون | الكود | الاستخدام |
|---|---|---|
| أزرق فاتح عاجي | `#D6E9FF` | إطار BOSS + نصوص المتابعين |
| أزرق أساسي | `#4D8DFF` | الحدود + الشارات + الخطوط |
| أزرق غامق برونزي | `#2E5FA3` | تدرجات + حلقة الأفاتار |
| تاج لامع | `#9CC5FF` | أيقونة التاج + توهج `rgba(255,215,106,0.9)` |
| أزرق Storm/متصل | `#9CC5FF` | زر Kick hover + نقطة live + شارة `@handle` |
| بنفسجي خافت | `#2E5FA3` | تدرج خلفية البانر الاحتياطي فقط |
| أسود القلعة | `#080808` / `#0b0b0b` | خلفية البطاقات |
| أبيض شفاف | `white/[0.03]` → `white/70` | النصوص والحدود الزجاجية |

**الخطوط:**

- الأسماء: `font-black` + `dir="ltr"` (لأنها إنجليزية دائماً)
- `KICK: ...`: `text-[10px] font-bold text-[#4D8DFF]/80` + `dir="ltr"`
- البايو: `dir="auto"` (يدعم عربي وإنجليزي تلقائياً)
- الشارات: `tracking-[0.16em]` + `uppercase`

---

## 7- ✒️ الأيقونات SVG الخاصة بالقسم

4 أيقونات مرسومة يدوياً داخل نفس الملف (لا مكتبات خارجية):

```tsx
// 1. شعار X
const XIconSmall = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// 2. شعار Kick (مبسّط)
const KickIconSmall = ... // مربع + ذيل K

// 3. التاج — للقائد فقط
const CrownIcon = ...
// path: M2.5 8.5 6.5 12l5.5-7 5.5 7 4-3.5L20 18H4L2.5 8.5z + قاعدة مستطيلة

// 4. الدرع — شارة "مشرف" على كل بطاقة
const ShieldIcon = ... // درع + علامة صح ✓
```

| الأيقونة | الحجم | اللون | المكان |
|---|---|---|---|
| `XIconSmall` | `w-3.5 h-3.5` | أبيض → أسود عند hover | زر X أعلى البانر + زر Follow |
| `KickIconSmall` | `w-4 h-4` | أبيض → `#9CC5FF` عند hover | زر Kick |
| `CrownIcon` | `w-7 h-7` | `#9CC5FF` + `animate-float-soft` | فوق أفاتار القائد |
| `ShieldIcon` | `w-3 h-3` | `#4D8DFF` | شارة MOD أعلى البطاقة |

---

## 8- 🔗 الربط في `App.tsx` — أين يظهر القسم؟

### 8.1 الاستيراد الكسول (Lazy) — القسم لا يبطّئ أول تحميل

```ts
// App.tsx سطر 29
const ModeratorsSection = lazy(() => import('./components/ModeratorsSection'));
```

### 8.2 العنوان

```ts
// TRANSLATIONS
en: { modsTitle: 'Moderators' }
ar: { modsTitle: 'المشرفون' }
```

### 8.3 التركيب في الصفحة

```tsx
{/* ===== MODERATORS ===== */}
<section id="moderators" className="pt-6 md:pt-8 scroll-mt-28">
  <Reveal>
    <SectionHeading
      no={streamInfo.isLive ? '06' : '05'}
      title={t.modsTitle}
      en="MODERATORS"
    />
  </Reveal>
  <Reveal delay={80}>
    <Suspense fallback={<div className="w-full h-64 rounded-[26px] border border-white/10 bg-white/[0.02] animate-pulse" />}>
      <ModeratorsSection lang={lang} />
    </Suspense>
  </Reveal>
</section>
```

**شرح:**

- `id="moderators"` — رابط مباشر `#moderators`
- `SectionHeading` — عنوان موحد مع باقي الأقسام (رقم كبير `05/06` بخط `Bangers` + خط أزرق)
- `Reveal` — ظهور تدريجي عند السكرول (IntersectionObserver)
- `Suspense` — هيكل نابض `animate-pulse` أثناء تحميل ملف القسم

**ترتيب الأقسام في الصفحة:** بث → سوشيال → مجتمع → معرض → **👥 المشرفون** → إحصائيات → آخر جلسة → لعبة فراس رنر

---

## 9- 📖 شرح الكود سطر بسطر

### الأسطر 1–23: الأنواع والقائمة

```ts
import React, { useEffect, useState } from 'react';
import type { Language } from '../types';  // 'ar' | 'en'
```

### الأسطر 25–45: البروفايل والأدوات

```ts
interface ModProfile { name; handle; avatar; banner; bio; followers; tweets; live; }

const CACHE_KEY = 'firas_mods_cache_v1';
const CACHE_TTL_MS = 30 * 60 * 1000;  // الكاش صالح 30 دقيقة
const REFRESH_MS = 10 * 60 * 1000;    // إعادة جلب كل 10 دقائق

// تنسيق الأرقام: 1500 → 1.5K ، 2000000 → 2.0M ، null → ---
const compact = (n) => {
  if (n == null || !Number.isFinite(n)) return '---';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};
```

### الأسطر 120–184: المكوّن والحالة

```ts
const ModeratorsSection: React.FC<{ lang: Language }> = ({ lang }) => {
  // profiles: قاموس handle → ModProfile ، يبدأ من الكاش فوراً (بدون انتظار)
  const [profiles, setProfiles] = useState(() => readCache()?.data || {});
  const [loading, setLoading] = useState(true);

  const t = {
    mod: lang === 'ar' ? 'مشرف' : 'MOD',
    followers: lang === 'ar' ? 'متابع' : 'Followers',
    posts: lang === 'ar' ? 'منشور' : 'Posts',
    follow: lang === 'ar' ? 'تابع' : 'Follow',
    viewKick: 'Kick',  // ثابت بالإنجليزية
  };
```

### دالة `get` — Fallback الذكي

```ts
const get = (x: string): ModProfile => {
  const p = profiles[x.toLowerCase()];
  if (p) return p;
  const r = ROSTER.find((m) => m.x.toLowerCase() === x.toLowerCase())!;
  return { name: r.kick, handle: x, avatar: '', banner: '', bio: '', followers: null, tweets: null, live: false };
};
```

> إذا فشل جلب X: الاسم = اسم Kick، الصورة = الحرف الأول، الأرقام = `---`، `live: false` (بدون نقطة خضراء).

---

## 10- 💾 الكود الكامل للقسم (نسخ ولصق)

> الملف: `components/ModeratorsSection.tsx` — انسخ كما هو، لا يحتاج أي مكتبة إضافية (React فقط + Tailwind).

```tsx
import React, { useEffect, useState } from 'react';
import type { Language } from '../types';

interface RosterEntry { kick: string; x: string; boss?: boolean; }

// 11 moderators — Kick name + X handle (live data via FixTweet)
const ROSTER: RosterEntry[] = [
  { kick: 'A7MEDO', x: '_A7MEDO_', boss: true },
  { kick: 'iiiBADR', x: '1liBadr' },
  { kick: 'JustN2sr', x: 'JustN2sr' },
  { kick: 'llHMD', x: '1HHMMDD' },
  { kick: '2Yaseer', x: 'ieY52' },
  { kick: 'M0ATAZ', x: 'S7_Moataz' },
  { kick: 'Alghamdiz', x: 'S7le_A' },
  { kick: 'xAREEJ1', x: 'itsxAREEJ1' },
  { kick: 'uANWAR', x: '_pnj8' },
  { kick: 'MISK_RY', x: 'MISK_RY' },
  { kick: '7rema', x: '7reml4' },
];

interface ModProfile {
  name: string; handle: string; avatar: string; banner: string;
  bio: string; followers: number | null; tweets: number | null; live: boolean;
}

const CACHE_KEY = 'firas_mods_cache_v1';
const CACHE_TTL_MS = 30 * 60 * 1000;
const REFRESH_MS = 10 * 60 * 1000;

const compact = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return '---';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

async function fetchJson(url: string, timeoutMs = 10000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

async function fetchMod(handle: string): Promise<ModProfile | null> {
  const target = `https://api.fxtwitter.com/${handle}`;
  let user: any = null;
  try {
    const via = await fetchJson('/api/kick?endpoint=' + encodeURIComponent(target));
    user = via?.user || null;
  } catch {}
  if (!user) {
    try {
      const direct = await fetchJson(target);
      user = direct?.user || null;
    } catch {}
  }
  if (!user) return null;
  const avatarRaw: string = user.avatar_url || '';
  const bannerRaw: string = user.banner_url || '';
  return {
    name: user.name || handle,
    handle: user.screen_name || handle,
    avatar: avatarRaw ? avatarRaw.replace('_normal.', '_400x400.') : '',
    banner: bannerRaw ? `${bannerRaw}/1500x500` : '',
    bio: user.description || '',
    followers: typeof user.followers === 'number' ? user.followers : null,
    tweets: typeof user.tweets === 'number' ? user.tweets : null,
    live: true,
  };
}

function readCache(): { at: number; data: Record<string, ModProfile> } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data) return null;
    return parsed;
  } catch { return null; }
}

// ... الأيقونات XIconSmall / KickIconSmall / CrownIcon / ShieldIcon (انسخها من الملف الأصلي)
// ... المكوّن ModeratorsSection + BOSS HERO + MODS GRID (انسخها من الملف الأصلي سطور 120–313)

export default ModeratorsSection;
```

> ⚠️ **للنسخة الحرفية 100%:** انسخ ملف `components/ModeratorsSection.tsx` كاملاً (313 سطر) — المقتطف أعلاه للمنطق، والـ JSX للبطاقات انسخه من المصدر لتضمن كل كلاسات Tailwind.

---

## 11- 🌍 الترجمة العربية / الإنجليزية

```ts
const t = {
  mod:       lang === 'ar' ? 'مشرف'  : 'MOD',
  followers: lang === 'ar' ? 'متابع' : 'Followers',
  posts:     lang === 'ar' ? 'منشور' : 'Posts',
  follow:    lang === 'ar' ? 'تابع'  : 'Follow',
  viewKick:  'Kick', // ثابت
};
```

وعنوان القسم من `App.tsx`:

```ts
en: { modsTitle: 'Moderators' }
ar: { modsTitle: 'المشرفون' }
```

قواعد الاتجاه:

- كل ما هو إنجليزي (أسماء، @handle، KICK:) → `dir="ltr"`
- البايو → `dir="auto"` (يُحدد الاتجاه تلقائياً حسب لغة بايو X)
- باقي الواجهة → تتبع `dir="rtl"` العامة من `<html lang="ar" dir="rtl">`

---

## 12- ⚡ الأداء والكاش والتحديث التلقائي

| الميزة | القيمة | الفائدة |
|---|---|---|
| `CACHE_KEY` | `firas_mods_cache_v1` | مفتاح localStorage |
| `CACHE_TTL_MS` | 30 دقيقة | لا طلبات X لمدة نصف ساعة بعد أول تحميل |
| `REFRESH_MS` | 10 دقائق | تحديث صامت بالخلفية أثناء بقاء الصفحة مفتوحة |
| الدفعات | 3 متوازية | لطيف على FixTweet، وعرض تدريجي |
| `timeout` | 10 ثواني/طلب | لا تعليق أبداً |
| `lazy()` + `Suspense` | تحميل كسول | 0 بايت من القسم في أول رسم للصفحة |
| `loading="lazy"` | كل الصور | الصور تُحمّل عند الاقتراب فقط |
| `cancelled` flag | تنظيف useEffect | يمنع تحديث state بعد مغادرة الصفحة |

```ts
useEffect(() => {
  let cancelled = false;
  const load = async (useCacheFirst = true) => {
    const cached = readCache();
    const fresh = cached && Date.now() - cached.at < CACHE_TTL_MS;
    if (useCacheFirst && fresh) {
      setProfiles(cached.data);
      setLoading(false);
      return; // كاش جديد — لا نطلب X أبداً
    }
    // ... جلب الدفعات ثم حفظ: localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }))
  };
  load(true);
  const timer = setInterval(() => load(false), REFRESH_MS);
  return () => { cancelled = true; clearInterval(timer); };
}, []);
```

---

## 13- 📱 التجاوب مع الجوال والشاشات

| الشاشة | BOSS HERO | MODS GRID |
|---|---|---|
| 📱 جوال `<640px` | بانر `h-36` + أفاتار `w-20` + عمودي (الاسم فوق العدّادات) | عمود واحد `grid-cols-1` + بانر `h-20` |
| 📲 كبير `sm:` | بانر `h-48` + أفاتار `w-24` + أفقي | عمودان `sm:grid-cols-2` |
| 🖥️ عريض `lg:` | بانر `h-56` | 3 أعمدة `lg:grid-cols-3` |
| `md:` | حواف `rounded-[28px]` وهوامش أكبر | فجوة `gap-4` |

نقاط إضافية:

- الأفاتار `-mt-10 sm:-mt-12` يتداخل مع البانر (تأثير البطاقات الاجتماعية).
- النصوص `truncate` تمنع كسر التخطيط مع الأسماء الطويلة.
- البايو `line-clamp-2 min-h-[32px]` — سطران كحد أقصى + ارتفاع ثابت يوازن البطاقات.

---

## 14- ➕ كيف تضيف / تحذف / تغيّر القائد؟

### إضافة مشرف جديد (12th)

```ts
// أضف سطراً في ROSTER:
{ kick: 'NewKickName', x: 'NewXHandle' },
```

فقط! البطاقة والجلب من X والكاش يعملون تلقائياً.

### حذف مشرف

احذف سطره من `ROSTER` — لا شيء آخر مطلوب.

### تغيير القائد

انقل سطره ليكون **الأول** في المصفوفة:

```ts
const ROSTER = [
  { kick: 'JustN2sr', x: 'JustN2sr', boss: true }, // أصبح القائد الجديد
  { kick: 'A7MEDO', x: '_A7MEDO_' },               // عاد للشبكة
  ...
];
```

### تصفير الكاش بعد تعديل الأسماء (مهم!)

غيّر رقم النسخة حتى لا يرى الزوار بيانات قديمة:

```ts
const CACHE_KEY = 'firas_mods_cache_v2'; // كان v1
```

---

## 15- 🧰 الأخطاء الشائعة والحلول

| المشكلة | السبب | الحل |
|---|---|---|
| كل البطاقات تظهر `---` والحرف الأول | FixTweet محجوب أو الـ handle تغيّر | افتح `https://api.fxtwitter.com/{handle}` بالمتصفح وتأكد من وجود `user` |
| صور ضبابية | نسيان `replace('_normal.', '_400x400.')` | تحقق من سطر الأفاتار |
| بانر لا يظهر | الحساب بدون غلاف | طبيعي — يظهر التدرج الاحتياطي الأزرق/البنفسجي |
| بيانات قديمة بعد تغيير يوزر | كاش 30 دقيقة | غيّر `CACHE_KEY` إلى `v2` أو امسح localStorage |
| CORS error | البروكسي `/api/kick` متوقف | الطبقة 2 (المباشر) ستعمل كاحتياط تلقائياً |
| القسم فارغ تماماً | خطأ في `ROSTER` (فاصلة/قوس) | افتح Console وابحث عن SyntaxError |

---

## 16- ✅ ملخص سريع للمطور

```
الملف:       components/ModeratorsSection.tsx
النوع:       React FC + Tailwind فقط (لا مكتبات)
البيانات:    ROSTER ثابت (11) + X حي via FixTweet
البروكسي:    api/kick.ts (Edge) → fallback مباشر → fallback ثابت
الكاش:       localStorage 30د + تحديث 10د + دفعات 3
التصميم:     BOSS أزرق فاخر + GRID زجاجي 1/2/3
الألوان:     #D6E9FF / #4D8DFF / #2E5FA3 / #9CC5FF / #080808
الربط:       App.tsx → <section id="moderators"> → lazy + Suspense + Reveal
الترجمة:     t.mod/followers/posts/follow + modsTitle
التعديل:     أضف/احذف سطر ROSTER + ارفع CACHE_KEY
```

---

> 📝 **وُثّق من الكود الفعلي للمشروع** — `ModeratorsSection.tsx` + `App.tsx` + `api/kick.ts` + `index.html` (الهوية والألوان).
> 🔒 **لم يُعدَّل أي سطر برمجي** — هذا الملف توثيق فقط كما طُلب.
> 👑 القائد: **A7MEDO** — الفريق: **10 مشرفين** — المصدر الحي: **X via FixTweet**.
