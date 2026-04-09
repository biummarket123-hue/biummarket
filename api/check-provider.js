export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { email } = req.body || {};
    if (!email) { res.status(400).json({ error: '이메일이 필요합니다' }); return; }

    const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
    const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      res.status(500).json({ error: 'Supabase 환경변수 미설정' });
      return;
    }

    // Supabase Admin Auth API로 이메일에 해당하는 유저 조회
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
      }
    });

    // 이메일로 직접 필터링 (admin API)
    const searchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,email,extra_info`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
        }
      }
    );
    const users = await searchRes.json();

    // users 테이블에서 provider 추출 시도
    let provider = '';
    if (users && users.length > 0) {
      const user = users[0];
      // extra_info에서 provider 확인
      if (user.extra_info) {
        try {
          const info = typeof user.extra_info === 'string' ? JSON.parse(user.extra_info) : user.extra_info;
          if (info.provider) provider = info.provider;
        } catch (e) {}
      }

      // auth.users에서 provider 확인 (더 정확)
      if (user.id) {
        const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
          }
        });
        const authUser = await authRes.json();
        if (authUser?.app_metadata?.provider) {
          provider = authUser.app_metadata.provider;
        }
        // identities에서도 확인
        if (!provider || provider === 'email') {
          const identities = authUser?.identities || [];
          const socialId = identities.find(i => i.provider !== 'email');
          if (socialId) provider = socialId.provider;
        }
      }
    }

    res.status(200).json({ success: true, provider: provider || 'email' });
  } catch (e) {
    console.error('[check-provider] 예외:', e);
    res.status(500).json({ error: e.message });
  }
}
