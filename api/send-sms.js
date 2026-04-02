export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { phone } = req.body || {};
  if (!phone) { res.status(400).json({ error: '전화번호가 필요합니다' }); return; }

  // 6자리 인증번호 생성
  const code = String(Math.floor(100000 + Math.random() * 900000));

  try {
    // 알리고 SMS API 호출
    const params = new URLSearchParams({
      key: 'ugaosl3ua62gt7v26mxauxnn8eke8cwf',
      user_id: 'biummarket',
      sender: '01045241138',
      receiver: phone.replace(/-/g, ''),
      msg: `[비움마켓] 인증번호는 [${code}] 입니다. 3분 이내에 입력해주세요.`,
      testmode_yn: 'N'
    });

    const apiRes = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const apiData = await apiRes.json();

    if (apiData.result_code < 0) {
      res.status(500).json({ error: apiData.message || 'SMS 발송 실패' });
      return;
    }

    // 인증번호를 클라이언트에 반환 (서버 세션 없는 구조이므로)
    res.status(200).json({ success: true, code });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
