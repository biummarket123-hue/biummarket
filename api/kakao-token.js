export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if(req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { code } = req.query;

  if(!code) {
    res.status(400).json({ error: 'code 파라미터가 필요합니다' });
    return;
  }

  try {
    const clientId = (process.env.KAKAO_CLIENT_ID || '2a0cb674c93b653e5e51382a15763bf9').trim();
    const rawSecret = process.env.KAKAO_CLIENT_SECRET;
    const clientSecret = (rawSecret || '').trim();

    // client_secret이 비어 있으면 body에서 제외 (undefined 문자열 전송 방지)
    const bodyParams = {
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: 'https://www.biummarket.com',
      code
    };
    if (clientSecret) bodyParams.client_secret = clientSecret;

    // 서버에서 카카오 토큰 교환 (client_secret 노출 방지)
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(bodyParams)
    });
    const tokenData = await tokenRes.json();

    if(!tokenData.access_token) {
      console.error('[kakao-token] 토큰 발급 실패:', {
        status: tokenRes.status,
        kakaoResponse: tokenData,
        clientIdLen: clientId.length,
        hasClientSecret: !!clientSecret,
        clientSecretLen: clientSecret.length
      });
      res.status(400).json({
        error: tokenData.error_description || tokenData.msg || '토큰 발급 실패',
        kakaoError: tokenData.error,
        diagnostic: {
          hasClientSecret: !!clientSecret,
          clientSecretLen: clientSecret.length,
          clientIdLen: clientId.length
        }
      });
      return;
    }

    // 서버에서 사용자 정보 조회
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token }
    });
    const userData = await userRes.json();

    res.status(200).json(userData);
  } catch(e) {
    console.error('[kakao-token] 예외:', e);
    res.status(500).json({ error: e.message });
  }
}
