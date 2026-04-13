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

    // 3. Supabase Admin API로 auth user 조회/생성
    const headers = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    };

    // 이메일로 기존 auth user 검색
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, {
      method: 'GET',
      headers
    });
    // 이메일 기반 검색은 admin API에서 직접 지원하지 않으므로 다른 방법 사용
    // signInWithPassword 대신 이메일로 조회
    let authUser = null;

    // 기존 사용자 조회 (이메일 기반)
    const searchRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'GET',
      headers
    });
    if(searchRes.ok) {
      const allUsers = await searchRes.json();
      const userList = allUsers.users || allUsers;
      if(Array.isArray(userList)) {
        authUser = userList.find(u => u.email === email);
      }
    }

    if(!authUser) {
      // 신규 auth user 생성 (임시 비밀번호, 이메일 확인 스킵)
      const randomPw = 'OAuth_' + crypto.randomUUID();
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          password: randomPw,
          email_confirm: true,
          user_metadata: { name: nickname, provider: 'naver', naver_id: naverId }
        })
      });
      if(!createRes.ok) {
        const errText = await createRes.text();
        console.error('[naver-auth] auth user 생성 실패:', errText);
        res.status(500).json({error:'auth user 생성 실패', detail: errText}); return;
      }
      authUser = await createRes.json();
      console.log('[naver-auth] 새 auth user 생성:', authUser.id);
    } else {
      console.log('[naver-auth] 기존 auth user 발견:', authUser.id);
    }

    const authUid = authUser.id;

    // 4. public.users.id 동기화 (불일치 시)
    const pubRes = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id`, {
      headers: {'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`}
    });
    if(pubRes.ok) {
      const pubUsers = await pubRes.json();
      if(pubUsers.length && pubUsers[0].id !== authUid) {
        const oldId = pubUsers[0].id;
        console.log('[naver-auth] ID 동기화:', oldId, '→', authUid);
        // public.users id 업데이트
        await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${oldId}`, {
          method: 'PATCH',
          headers: {...headers, 'Prefer': 'return=minimal'},
          body: JSON.stringify({id: authUid})
        });
        // 관련 테이블 참조 업데이트
        const tables = [
          {table:'products', field:'seller_id'},
          {table:'chat_rooms', field:'seller_id'},
          {table:'chat_rooms', field:'buyer_id'},
          {table:'chat_messages', field:'sender_id'},
          {table:'wishes', field:'user_id'},
          {table:'follows', field:'follower_id'},
          {table:'follows', field:'seller_id'},
          {table:'price_offers', field:'buyer_id'},
          {table:'price_offers', field:'seller_id'},
          {table:'reservations', field:'buyer_id'},
          {table:'reservations', field:'seller_id'},
        ];
        await Promise.allSettled(tables.map(t =>
          fetch(`${SUPABASE_URL}/rest/v1/${t.table}?${t.field}=eq.${oldId}`, {
            method: 'PATCH',
            headers: {...headers, 'Prefer': 'return=minimal'},
            body: JSON.stringify({[t.field]: authUid})
          })
        ));
        console.log('[naver-auth] ID 동기화 완료');
      }
    }

    // 5. 임시 토큰 생성 (generateLink로 magic link 생성 후 토큰 추출)
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'magiclink',
        email,
        options: { data: { provider: 'naver' } }
      })
    });
    if(!linkRes.ok) {
      const errText = await linkRes.text();
      console.error('[naver-auth] generate_link 실패:', errText);
      res.status(500).json({error:'토큰 생성 실패'}); return;
    }
    const linkData = await linkRes.json();

    // OTP로 세션 검증
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'magiclink',
        token: linkData.properties?.hashed_token || linkData.hashed_token,
        email
      })
    });

    if(!verifyRes.ok) {
      const errText = await verifyRes.text();
      console.error('[naver-auth] verify 실패:', errText);
      res.status(500).json({error:'세션 검증 실패'}); return;
    }

    const sessionData = await verifyRes.json();

    res.status(200).json({
      success: true,
      authUid,
      session: {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token
      },
      profile: { ...profile, email, nickname }
    });

  } catch(e) {
    console.error('[naver-auth] 예외:', e);
    res.status(500).json({error: e.message});
  }
}
