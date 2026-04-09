export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) {
      res.status(400).json({ error: '전화번호와 인증번호가 필요합니다' });
      return;
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      res.status(500).json({ error: 'Supabase 환경변수 미설정' });
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    // Supabase에서 해당 전화번호의 최신 인증코드 조회
    const queryRes = await fetch(
      `${SUPABASE_URL}/rest/v1/sms_codes?phone=eq.${cleanPhone}&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
        }
      }
    );
    const rows = await queryRes.json();

    if (!rows || rows.length === 0) {
      res.status(400).json({ success: false, error: '인증번호를 먼저 요청해주세요' });
      return;
    }

    const record = rows[0];

    // 만료 확인 (3분)
    const elapsed = Date.now() - new Date(record?.created_at || 0).getTime();
    if (elapsed > 180000) {
      res.status(400).json({ success: false, error: '인증번호가 만료됐어요. 다시 받아주세요.' });
      return;
    }

    // 이미 인증 완료된 코드인지 확인
    if (record.verified) {
      res.status(400).json({ success: false, error: '이미 사용된 인증번호입니다. 다시 받아주세요.' });
      return;
    }

    // 인증번호 비교
    if (code !== record.code) {
      res.status(400).json({ success: false, error: '인증번호가 일치하지 않아요' });
      return;
    }

    // 인증 성공 → verified 업데이트
    await fetch(
      `${SUPABASE_URL}/rest/v1/sms_codes?id=eq.${record.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ verified: true })
      }
    );

    res.status(200).json({ success: true });
  } catch (e) {
    console.error('[verify-sms] 예외:', e);
    res.status(500).json({ error: e.message });
  }
}
