export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS'){ res.status(200).end(); return; }
  if(req.method !== 'POST'){ res.status(405).json({error:'Method not allowed'}); return; }
  try{
    const { user } = req.body;
    if(!user || !user.id || !user.email){
      res.status(400).json({error:'user 데이터 필수 (id, email)'}); return;
    }
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if(!SUPABASE_URL || !SUPABASE_SERVICE_KEY){
      res.status(500).json({error:'Supabase 환경변수 없음: URL='+(SUPABASE_URL?'있음':'없음')+', KEY='+(SUPABASE_SERVICE_KEY?'있음':'없음')}); return;
    }
    // 테이블에 존재하는 컬럼만 필터링
    const allowedCols = ['id','name','email','type','loc','tel','temp','join_date','created_at','seller_status','requested_role','extra_info','loc_detail','category'];
    const filtered = {};
    for(const k of allowedCols){
      if(user[k] !== undefined) filtered[k] = user[k];
    }
    console.log('[create-user] insert 데이터:', JSON.stringify(filtered).slice(0,500));
    const headers = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    // upsert로 중복 방지 (이미 존재하면 update)
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {...headers, 'Prefer': 'return=representation,resolution=merge-duplicates'},
      body: JSON.stringify(filtered)
    });
    const text = await insertRes.text();
    console.log('[create-user] Supabase 응답:', insertRes.status, text.slice(0,300));
    if(!insertRes.ok){
      res.status(insertRes.status).json({error: text, status: insertRes.status}); return;
    }
    let data;
    try{ data = JSON.parse(text); }catch(e){ data = text; }
    res.status(200).json({success: true, data});
  }catch(e){
    console.error('[create-user] 예외:', e);
    res.status(500).json({error: e.message});
  }
}
