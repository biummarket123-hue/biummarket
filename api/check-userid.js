export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { userId } = req.body || {};
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId required' });
      return;
    }
    const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
    const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      res.status(500).json({ error: 'Supabase 환경변수 미설정' });
      return;
    }

    const email = (userId.trim() + '@bium.market').toLowerCase();
    const headers = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    };

    // 1. public.users 체크
    const publicRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id`,
      { headers }
    );
    const publicData = await publicRes.json();
    if (Array.isArray(publicData) && publicData.length > 0) {
      res.status(200).json({ available: false, source: 'public' });
      return;
    }

    // 2. auth.users 체크 - admin API에서 전체 조회 후 클라이언트 필터링
    // (비움마켓은 사용자 수가 많지 않아 단순 전체 조회가 안전하고 확실함)
    const authRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`,
      { headers }
    );
    const authData = await authRes.json();
    const allUsers = authData?.users || [];
    const match = allUsers.find(u => ((u.email || '').toLowerCase() === email));
    if (match) {
      res.status(200).json({ available: false, source: 'auth', orphan: true });
      return;
    }

    res.status(200).json({ available: true });
  } catch (e) {
    console.error('[check-userid] 예외:', e);
    res.status(500).json({ error: e.message });
  }
}
