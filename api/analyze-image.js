export const config = { runtime: 'edge' };

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { base64, mediaType } = body;
  if (!base64 || !mediaType) {
    return new Response(JSON.stringify({ error: 'base64 and mediaType are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              {
                type: 'text',
                text: '이 원단 사진을 분석해서 아래 JSON 형식으로만 응답해줘. 다른 텍스트 없이 JSON만:\n{"name":"상품명 (소재+조직+색상 조합, 예: 코마 면 트윌 60수 오트밀)","category":"대분류 (면/린넨, 폴리/합섬, 울/모직, 니트/져지, 실크/새틴, 데님/청, 기능성, 레이스/자수 중 하나)","material":"소재 (예: 면 100%, 폴리에스터 80% 나일론 20%)","weight":"중량 (예: 185g/yd, 모르면 빈 문자열)","description":"상세설명 (원단 특징, 용도, 느낌, 활용처 등 3-4문장)"}',
              },
            ],
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('[analyze-image] Claude API 오류:', errText);
      return new Response(JSON.stringify({ error: 'Claude API error', detail: errText }), {
        status: claudeRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await claudeRes.json();
    const text = data.content?.[0]?.text || '';
    console.log('[analyze-image] Claude 원문 응답:', text);

    // 마크다운 코드블록 제거 후 JSON 추출
    const cleaned = text.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    let result = null;
    if (match) {
      try {
        result = JSON.parse(match[0]);
      } catch (parseErr) {
        console.error('[analyze-image] JSON 파싱 실패:', parseErr.message, '원문:', match[0]);
      }
    } else {
      console.warn('[analyze-image] JSON 객체를 찾을 수 없음. cleaned:', cleaned);
    }

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    console.error('[analyze-image] 예외:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
