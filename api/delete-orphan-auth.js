export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'email required' });
      return;
    }
    const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
    const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      res.status(500).json({ error: 'Supabase 환경변수 미설정' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const headers = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    };

    // 안전장치 1: public.users에 해당 이메일이 있으면 고아가 아니므로 삭제 거부
    const publicRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(normalizedEmail)}&select=id`,
      { headers }
    );
    const publicData = await publicRes.json();
    if (Array.isArray(publicData) && publicData.length > 0) {
      res.status(409).json({ error: '실제 가입 프로필이 존재합니다. 고아가 아니므로 삭제 거부', protected: true });
      return;
    }

    // auth.users에서 해당 이메일 검색 (admin API 전체 조회 후 필터링)
    const authListRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`,
      { headers }
    );
    const authListData = await authListRes.json();
    const allUsers = authListData?.users || [];
    const target = allUsers.find(u => (u.email || '').toLowerCase() === normalizedEmail);

    if (!target) {
      // auth에도 없음 → 삭제할 것 없음 (성공으로 처리하여 retry 진행 가능하게)
      res.status(200).json({ success: true, notFound: true });
      return;
    }

    // 안전장치 2: target.id로 public.users 재확인 (한 번 더)
    const publicRes2 = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${target.id}&select=id`,
      { headers }
    );
    const publicData2 = await publicRes2.json();
    if (Array.isArray(publicData2) && publicData2.length > 0) {
      res.status(409).json({ error: '해당 id의 public 프로필이 존재합니다. 삭제 거부', protected: true });
      return;
    }

    // auth.users에서 삭제
    const delRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${target.id}`,
      { method: 'DELETE', headers }
    );

    if (!delRes.ok) {
      const txt = await delRes.text();
      res.status(delRes.status).json({ error: 'auth 삭제 실패: ' + txt });
      return;
    }

    res.status(200).json({ success: true, deletedId: target.id });
  } catch (e) {
    console.error('[delete-orphan-auth] 예외:', e);
    res.status(500).json({ error: e.message });
  }
}
