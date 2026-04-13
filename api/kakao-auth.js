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
    const { code } = req.body;
    if(!code) { res.status(400).json({error:'code 필수'}); return; }

    // 1. 카카오 토큰 교환
    const clientId = (process.env.KAKAO_CLIENT_ID || '2a0cb674c93b653e5e51382a15763bf9').trim();
    const rawSecret = process.env.KAKAO_CLIENT_SECRET;
    const clientSecret = (rawSecret || '').trim();
    const bodyParams = {
      grant_type: 'authorization_code', client_id: clientId,
      redirect_uri: 'https://www.biummarket.com', code
    };
    if(clientSecret) bodyParams.client_secret = clientSecret;

    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams(bodyParams)
    });
    const tokenData = await tokenRes.json();
    if(!tokenData.access_token) {
      res.status(400).json({error: tokenData.error_description || '카카오 토큰 발급 실패'}); return;
    }

    // 2. 카카오 사용자 정보 조회
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {Authorization: 'Bearer ' + tokenData.access_token}
    });
    const userData = await userRes.json();
    const kakaoId = userData.id;
    const nickname = userData.kakao_account?.profile?.nickname || userData.properties?.nickname || '카카오사용자';
    const email = userData.kakao_account?.email || ('kakao_' + kakaoId + '@kakao.com');
    const fixedPw = 'BiumOAuth_' + email.replace(/[^a-zA-Z0-9]/g, '_') + '_!Secure2026';

    // 3. Supabase Admin API
    const adminHeaders = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    };

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
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST', headers: adminHeaders,
        body: JSON.stringify({
          email, password: fixedPw, email_confirm: true,
          user_metadata: { name: nickname, provider: 'kakao', kakao_id: String(kakaoId) }
        })
      });
      if(!createRes.ok) {
        const errText = await createRes.text();
        res.status(500).json({error:'auth user 생성 실패', detail: errText}); return;
      }
      authUser = await createRes.json();
      console.log('[kakao-auth] 새 auth user:', authUser.id);
    } else {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUser.id}`, {
        method: 'PUT', headers: adminHeaders,
        body: JSON.stringify({ password: fixedPw })
      });
      console.log('[kakao-auth] 기존 auth user:', authUser.id);
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
        console.log('[kakao-auth] ID 동기화:', oldId, '→', authUid);
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
      console.error('[kakao-auth] signIn 실패:', errText);
      res.status(500).json({error:'세션 생성 실패', detail: errText}); return;
    }
    const sessionData = await signInRes.json();

    res.status(200).json({
      success: true, authUid,
      session: { access_token: sessionData.access_token, refresh_token: sessionData.refresh_token },
      kakaoData: userData,
      profile: { email, nickname, kakaoId: String(kakaoId) }
    });

  } catch(e) {
    console.error('[kakao-auth] 예외:', e);
    res.status(500).json({error: e.message});
  }
}
