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
  console.log('[analyze-image] API 키 존재:', !!apiKey, '길이:', apiKey?.length);
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured (CLAUDE_API_KEY)' }), {
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
        max_tokens: 1024,
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
                text: '당신은 20년 경력의 한국 원단 전문가입니다. 동대문 원단 시장과 B2B 재고원단 거래에 정통합니다.\n이 원단 사진을 보고 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.\n\n{"name":"상품명 (조직+소재+색상 조합, 예: 코마 면 트윌 60수 오트밀, 광폭 폴리 쉬폰 아이보리)","category":"대분류 (면/린넨, 폴리/합섬, 울/모직, 니트/져지, 실크/새틴, 데님/청, 기능성, 레이스/자수 중 반드시 하나)","type":"원단 조직/종류 (트윌, 쉬폰, 새틴, 니트, 자카드, 플리스, 데님, 캔버스, 거즈, 보일, 타프타 등)","material":"소재 구성 (예: 면 100%, 폴리에스터 70% 레이온 30%)","color":"주요 색상 (예: 오트밀, 네이비, 블랙, 아이보리, 차콜그레이 등 구체적으로)","weight":"중량 (예: 180g/yd, 250g/m, 모르면 빈 문자열)","width":"폭 (예: 110cm, 150cm, 광폭 160cm, 모르면 빈 문자열)","texture":"질감/촉감 특성 (예: 부드럽고 광택있음, 두툼하고 따뜻함, 가볍고 통기성좋음)","usage":"주요 용도 (예: 여성복/블라우스/드레스, 아우터/코트, 침구류, 가방/소품)","season":"적합한 계절 (봄/여름, 가을/겨울, 사계절 중 하나)","grade":"품질 등급 추정 (프리미엄, 일반, 보급형 중 하나)","price_range":"적정 도매가 범위 (예: 3,000~5,000원/m, 동대문 시장 기준)","description":"전문가 소견 (원단 특징, 품질, 용도, 장단점, 거래 시 주의사항 등 3-4문장으로 상세히)"}',
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
