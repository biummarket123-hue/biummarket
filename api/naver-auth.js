export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') { res.status(200).end(); return; }
  if(req.method !== 'POST') { res.status(405).json({error:'Method not allowed'}); return; }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if(!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    res.status(500).json({error:'Supabase 환경변수 없음'}); return;
  }

  try {
    const { code, state } = req.body;
    if(!code) { res.status(400).json({error:'code 필수'}); return; }

    // 1. 네이버 토큰 교환
    const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=dYw4QkVqHsSd4DjthmE5&client_secret=iyQZH_fudf&code=${code}&state=${state}`);
    const tokenData = await tokenRes.json();
    if(!tokenData.access_token) {
      res.status(400).json({error: tokenData.error_description || '네이버 토큰 발급 실패'}); return;
    }

    // 2. 네이버 사용자 정보 조회
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {Authorization: 'Bearer ' + tokenData.access_token}
    });
    const userData = await userRes.json();
    const profile = userData.response;
    if(!profile) { res.status(400).json({error:'네이버 프로필 조회 실패'}); return; }

    const naverId = profile.id;
    const nickname = profile.name || profile.nickname || '네이버사용자';
    const email = profile.email || ('naver_' + naverId + '@naver.com');
    // OAuth 사용자 전용 고정 비밀번호 (서버에서만 사용)
    const fixedPw = 'BiumOAuth_' + email.replace(/[^a-zA-Z0-9]/g, '_') + '_!Secure2026';

    // 3. Supabase Admin API
    const adminHeaders = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    };

    // 이메일로 기존 auth user 검색
    let authUser = null;
    const searchRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'GET', headers: adminHeaders
    });
    if(searchRes.ok) {
      const allUsers = await searchRes.json();
      const userList = allUsers.users || allUsers;
      if(Array.isArray(userList)) authUser = userList.find(u => u.email === email);
    }

    if(!authUser) {
      // 신규 auth user 생성
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST', headers: adminHeaders,
        body: JSON.stringify({
          email, password: fixedPw, email_confirm: true,
          user_metadata: { name: nickname, provider: 'naver', naver_id: naverId }
        })
      });
      if(!createRes.ok) {
        const errText = await createRes.text();
        res.status(500).json({error:'auth user 생성 실패', detail: errText}); return;
      }
      authUser = await createRes.json();
      console.log('[naver-auth] 새 auth user:', authUser.id);
    } else {
      // 기존 user의 비밀번호를 고정 비밀번호로 갱신
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUser.id}`, {
        method: 'PUT', headers: adminHeaders,
        body: JSON.stringify({ password: fixedPw })
      });
      console.log('[naver-auth] 기존 auth user:', authUser.id);
    }

    const authUid = authUser.id;

    // 4. public.users.id 동기화
    const pubRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id`, {
      headers: {'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`}
    });
    if(pubRes.ok) {
      const pubUsers = await pubRes.json();
      if(pubUsers.length && pubUsers[0].id !== authUid) {
        const oldId = pubUsers[0].id;
        console.log('[naver-auth] ID 동기화:', oldId, '→', authUid);
        await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${oldId}`, {
          method: 'PATCH', headers: {...adminHeaders, 'Prefer': 'return=minimal'},
          body: JSON.stringify({id: authUid})
        });
        const tables = [
          {table:'products',field:'seller_id'},{table:'chat_rooms',field:'seller_id'},
          {table:'chat_rooms',field:'buyer_id'},{table:'chat_messages',field:'sender_id'},
          {table:'wishes',field:'user_id'},{table:'follows',field:'follower_id'},
          {table:'follows',field:'seller_id'},{table:'price_offers',field:'buyer_id'},
          {table:'price_offers',field:'seller_id'},{table:'reservations',field:'buyer_id'},
          {table:'reservations',field:'seller_id'},
        ];
        await Promise.allSettled(tables.map(t =>
          fetch(`${SUPABASE_URL}/rest/v1/${t.table}?${t.field}=eq.${oldId}`, {
            method: 'PATCH', headers: {...adminHeaders, 'Prefer': 'return=minimal'},
            body: JSON.stringify({[t.field]: authUid})
          })
        ));
      }
    }

    // 5. signInWithPassword로 세션 토큰 발급
    const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: fixedPw })
    });
    if(!signInRes.ok) {
      const errText = await signInRes.text();
      console.error('[naver-auth] signIn 실패:', errText);
      res.status(500).json({error:'세션 생성 실패', detail: errText}); return;
    }
    const sessionData = await signInRes.json();

    res.status(200).json({
      success: true, authUid,
      session: { access_token: sessionData.access_token, refresh_token: sessionData.refresh_token },
      profile: { ...profile, email, nickname }
    });

  } catch(e) {
    console.error('[naver-auth] 예외:', e);
    res.status(500).json({error: e.message});
  }
}
