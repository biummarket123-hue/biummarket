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

  const { base64, mediaType, labelBase64, labelMediaType } = body;
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
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              ...(labelBase64 && labelMediaType ? [{
                type: 'image',
                source: { type: 'base64', media_type: labelMediaType, data: labelBase64 },
              }] : []),
              {
                type: 'text',
                text: '당신은 30년 경력의 한국 원단 전문가입니다. 동대문 원단 시장, 섬유 제조업, B2B 재고원단 거래에 정통하며 원단 감별 능력이 탁월합니다.\n\n[소재 식별 기준]\n- 면: 무광택, 흡수성 좋음, 구김 잘 생김, 실 끝이 퍼짐\n- 린넨: 자연스러운 슬럽(불균일한 실), 거친 텍스처, 광택 없음, 시원한 느낌\n- 레이온: 부드럽고 약간 광택, 드레이프성 좋음, 린넨보다 균일한 조직\n- 폴리에스터: 균일한 조직, 약간 광택, 구김 적음\n- 나일론: 매끄럽고 광택, 탄성 있음\n- 울: 따뜻하고 보풀 있음, 크림프(곱슬) 있음\n- 실크: 자연스러운 광택, 매우 부드럽고 가벼움\n- 혼방: 위 특성들이 복합적으로 나타남\n\n[수(번수) 판별 기준]\n- 10~20수: 실이 굵고 거칠며 조직이 성김, 두꺼운 캔버스/마대 느낌\n- 20~30수: 실이 굵은 편, 린넨/데님류, 내구성 강함\n- 30~40수: 중간 굵기, 일반적인 면/린넨 셔츠감\n- 40~60수: 실이 가는 편, 부드럽고 균일한 조직\n- 60~80수: 매우 가늘고 촘촘, 고급 셔츠감/블라우스감\n- 80수 이상: 초세번, 매우 얇고 투명할 정도로 부드러움\n\n[조직 구분 기준]\n- 평직: 경위사가 1:1로 교차, 균일하고 단순한 패턴\n- 능직(트윌): 사선 방향의 능선이 보임, 데님/치노 등\n- 수자직(새틴): 광택이 강하고 매끄러움\n- 자카드: 조직 자체로 무늬가 만들어짐\n- 니트: 루프 구조, 신축성 있음\n\n[중량 추정 기준]\n- 얇고 비침: 60~100g/m\n- 가볍고 일반적: 100~150g/m\n- 중간 두께: 150~200g/m\n- 두툼함: 200~300g/m\n- 매우 두꺼움: 300g/m 이상\n\n[동대문 도매 시세 기준 (2024~2025년)]\n- 면 20~30수: 2,500~4,000원/m\n- 면 40~60수: 3,500~6,000원/m\n- 린넨 20~30수: 4,000~7,000원/m\n- 린넨/레이온 혼방: 4,500~8,000원/m\n- 폴리 쉬폰/조젯: 2,000~4,000원/m\n- 폴리 자카드: 5,000~12,000원/m\n- 울 소모: 15,000~40,000원/m\n- 실크: 20,000~80,000원/m\n\n이 원단 사진을 위 기준으로 정밀 분석하여 아래 JSON 형식으로만 응답하세요. 라벨/태그 사진이 함께 첨부된 경우 라벨의 소재 구성비, 번수, 중량 등의 정보를 우선 반영하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.\n\n{"name":"상품명 (조직+소재+색상 조합, 예: 코마 면 트윌 60수 오트밀, 광폭 폴리 쉬폰 아이보리)","category":"대분류 (면/린넨, 폴리/합섬, 울/모직, 니트/져지, 실크/새틴, 데님/청, 기능성, 레이스/자수 중 반드시 하나)","type":"원단 조직/종류 (트윌, 쉬폰, 새틴, 니트, 자카드, 플리스, 데님, 캔버스, 거즈, 보일, 타프타 등)","material":"소재 구성 (예: 면 100%, 폴리에스터 70% 레이온 30%)","color":"주요 색상 (예: 오트밀, 네이비, 블랙, 아이보리, 차콜그레이 등 구체적으로)","weight":"중량 (예: 180g/yd, 250g/m, 모르면 빈 문자열)","width":"폭 (예: 110cm, 150cm, 광폭 160cm, 모르면 빈 문자열)","texture":"질감/촉감 특성 (예: 부드럽고 광택있음, 두툼하고 따뜻함, 가볍고 통기성좋음)","usage":"주요 용도 (예: 여성복/블라우스/드레스, 아우터/코트, 침구류, 가방/소품)","season":"적합한 계절 (봄/여름, 가을/겨울, 사계절 중 하나)","grade":"품질 등급 추정 (프리미엄, 일반, 보급형 중 하나)","price_range":"적정 도매가 범위 (예: 3,000~5,000원/m, 동대문 시장 기준)","description":"전문가 소견 (원단 특징, 품질, 용도, 장단점, 거래 시 주의사항 등 3-4문장으로 상세히)"}',
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
