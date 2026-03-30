export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS'){ res.status(200).end(); return; }
  if(req.method !== 'POST'){ res.status(405).json({error:'Method not allowed'}); return; }
  try{
    const { user } = req.body;
    if(!user || !user.id || !user.email){
      res.status(400).json({error:'user 데이터 필수'}); return;
    }
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if(!SUPABASE_URL || !SUPABASE_SERVICE_KEY){
      res.status(500).json({error:'Supabase 환경변수 없음'}); return;
    }
    const headers = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    // service_role로 RLS 우회하여 users 테이블에 insert
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(user)
    });
    const text = await insertRes.text();
    if(!insertRes.ok){
      console.error('users insert 오류:', insertRes.status, text);
      res.status(insertRes.status).json({error: text}); return;
    }
    res.status(200).json({success: true, data: JSON.parse(text)});
  }catch(e){
    console.error('create-user 오류:', e);
    res.status(500).json({error: e.message});
  }
}
