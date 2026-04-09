export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { userId, newPassword } = req.body || {};
    if (!userId || !newPassword) {
      res.status(400).json({ error: '사용자 ID와 새 비밀번호가 필요합니다' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다' });
      return;
    }

    const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
    const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      res.status(500).json({ error: 'Supabase 환경변수 미설정' });
      return;
    }

    // Supabase Admin Auth API로 비밀번호 변경
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: newPassword })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[reset-password] Supabase 오류:', JSON.stringify(result));
      res.status(500).json({ error: result.msg || result.message || '비밀번호 변경 실패' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.error('[reset-password] 예외:', e);
    res.status(500).json({ error: e.message });
  }
}
