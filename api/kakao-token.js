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
    // 서버에서 카카오 토큰 교환 (client_secret 노출 방지)
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_CLIENT_ID || '27e1cc15dc74afe3bc3058cf623faf94',
        client_secret: process.env.KAKAO_CLIENT_SECRET,
        redirect_uri: 'https://www.biummarket.com',
        code
      })
    });
    const tokenData = await tokenRes.json();

    if(!tokenData.access_token) {
      res.status(400).json({ error: tokenData.error_description || '토큰 발급 실패' });
      return;
    }

    // 서버에서 사용자 정보 조회
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token }
    });
    const userData = await userRes.json();

    res.status(200).json(userData);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
