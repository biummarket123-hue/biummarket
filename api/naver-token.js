export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if(req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { code, state } = req.query;

  try {
    const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=nvcabgkBSUsoLBcwLvKt&client_secret=b3DwMmChOg&code=${code}&state=${state}`);
    const tokenData = await tokenRes.json();

    if(!tokenData.access_token) {
      res.status(400).json({error: tokenData.error_description || '토큰 발급 실패'});
      return;
    }

    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {Authorization: 'Bearer ' + tokenData.access_token}
    });
    const userData = await userRes.json();

    res.status(200).json(userData);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
}
