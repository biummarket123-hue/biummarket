export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { phone } = req.body || {};
    if (!phone) { res.status(400).json({ error: '전화번호가 필요합니다' }); return; }

    // 6자리 인증번호 생성
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const receiver = phone.replace(/[^0-9]/g, '');

    console.log('[send-sms] 발송 시도:', receiver);

    // 서버 외부 IP 확인 (디버깅용)
    let serverIp = 'unknown';
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      serverIp = ipData.ip;
      console.log('[send-sms] 서버 IP:', serverIp);
    } catch (e) { console.log('[send-sms] IP 확인 실패'); }

    // 알리고 SMS API 호출
    const formData = new URLSearchParams();
    formData.append('key', 'ugaosl3ua62gt7v26mxauxnn8eke8cwf');
    formData.append('user_id', 'biummarket');
    formData.append('sender', '01045241138');
    formData.append('receiver', receiver);
    formData.append('msg', '[비움마켓] 인증번호는 [' + code + '] 입니다. 3분 이내에 입력해주세요.');
    formData.append('testmode_yn', 'N');

    const apiRes = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: formData.toString()
    });

    const rawText = await apiRes.text();
    console.log('[send-sms] 알리고 응답:', rawText);

    let apiData;
    try { apiData = JSON.parse(rawText); } catch (e) {
      console.error('[send-sms] JSON 파싱 실패:', rawText);
      res.status(500).json({ error: 'SMS API 응답 파싱 실패', raw: rawText });
      return;
    }

    // IP 인증 오류 시 서버 IP 안내
    if (Number(apiData.result_code) === -101) {
      console.error('[send-sms] IP 인증 오류. 서버 IP:', serverIp);
      res.status(500).json({
        error: '알리고 IP 인증 오류. 알리고 관리자 페이지에서 IP를 허용해주세요.',
        server_ip: serverIp,
        result_code: apiData.result_code
      });
      return;
    }

    if (Number(apiData.result_code) < 0) {
      console.error('[send-sms] 알리고 오류:', apiData);
      res.status(500).json({ error: apiData.message || 'SMS 발송 실패', result_code: apiData.result_code });
      return;
    }

    console.log('[send-sms] 발송 성공:', receiver);
    res.status(200).json({ success: true, code });
  } catch (e) {
    console.error('[send-sms] 예외:', e);
    res.status(500).json({ error: e.message });
  }
}
