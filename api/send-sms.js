export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { phone } = req.body || {};
    if (!phone) { res.status(400).json({ error: '전화번호가 필요합니다' }); return; }

    const API_KEY = process.env.SOLAPI_API_KEY;
    const API_SECRET = process.env.SOLAPI_API_SECRET;
    const SENDER = process.env.SOLAPI_SENDER;

    if (!API_KEY || !API_SECRET || !SENDER) {
      res.status(500).json({ error: '솔라피 환경변수 미설정', key: !!API_KEY, secret: !!API_SECRET, sender: !!SENDER });
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const receiver = phone.replace(/[^0-9]/g, '');

    // 솔라피 HMAC 인증
    const date = new Date().toISOString();
    const salt = Math.random().toString(36).substring(2);
    const hmacData = date + salt;

    const { createHmac } = await import('crypto');
    const signature = createHmac('sha256', API_SECRET).update(hmacData).digest('hex');
    const authorization = `HMAC-SHA256 apiKey=${API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;

    const body = JSON.stringify({
      message: {
        to: receiver,
        from: SENDER,
        text: `[비움마켓] 인증번호는 [${code}] 입니다. 3분 이내에 입력해주세요.`
      }
    });

    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization
      },
      body
    });

    const result = await response.json();
    console.log('[send-sms] 솔라피 응답:', JSON.stringify(result));

    if (!response.ok || result.errorCode) {
      res.status(500).json({ error: result.errorMessage || 'SMS 발송 실패', detail: result });
      return;
    }

    res.status(200).json({ success: true, code });
  } catch (e) {
    console.error('[send-sms] 예외:', e);
    res.status(500).json({ error: e.message });
  }
}
