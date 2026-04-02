import https from 'https';
import querystring from 'querystring';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { phone } = req.body || {};
    if (!phone) { res.status(400).json({ error: '전화번호가 필요합니다' }); return; }

    const ALIGO_KEY = process.env.ALIGO_API_KEY;
    const ALIGO_ID = process.env.ALIGO_USER_ID;
    const ALIGO_SENDER = process.env.ALIGO_SENDER;

    if (!ALIGO_KEY || !ALIGO_ID || !ALIGO_SENDER) {
      res.status(500).json({ error: '알리고 환경변수 미설정', key: !!ALIGO_KEY, id: !!ALIGO_ID, sender: !!ALIGO_SENDER });
      return;
    }

    // 6자리 인증번호 생성
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const receiver = phone.replace(/[^0-9]/g, '');

    console.log('[send-sms] 발송 시도:', receiver);

    // 알리고 SMS API 호출 (https 모듈 사용)
    const postData = querystring.stringify({
      key: ALIGO_KEY,
      user_id: ALIGO_ID,
      sender: ALIGO_SENDER,
      receiver: receiver,
      msg: '[비움마켓] 인증번호는 [' + code + '] 입니다. 3분 이내에 입력해주세요.',
      testmode_yn: 'N'
    });

    const apiResult = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'apis.aligo.in',
        port: 443,
        path: '/send/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          console.log('[send-sms] 알리고 응답:', data);
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('JSON 파싱 실패: ' + data));
          }
        });
      });

      request.on('error', (e) => { reject(e); });
      request.write(postData);
      request.end();
    });

    if (Number(apiResult.result_code) < 0) {
      console.error('[send-sms] 알리고 오류:', apiResult);
      res.status(500).json({ error: apiResult.message || 'SMS 발송 실패', result_code: apiResult.result_code });
      return;
    }

    console.log('[send-sms] 발송 성공:', receiver);
    res.status(200).json({ success: true, code });
  } catch (e) {
    console.error('[send-sms] 예외:', e);
    res.status(500).json({ error: e.message });
  }
}
