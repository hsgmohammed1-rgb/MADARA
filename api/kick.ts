// Vercel Edge Function - هذا بروكسي سريع جداً وخاص بموقعك
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');

  if (!endpoint) {
    return new Response(JSON.stringify({ error: 'Endpoint is required' }), { status: 400 });
  }

  try {
    // الخادم الخاص بك (Vercel) هو من سيقوم بالطلب الآن وليس المتصفح
    const apiResponse = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return new Response(JSON.stringify({ error: `Kick API request failed: ${errorText}` }), { status: apiResponse.status });
    }

    const data = await apiResponse.json();

    // إرجاع البيانات الصافية للمتصفح مع تفعيل الكاش في سيرفرات Vercel
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300' // كاش لمدة دقيقة
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), { status: 500 });
  }
}
