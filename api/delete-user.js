export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS'){ res.status(200).end(); return; }
  if(req.method !== 'POST'){ res.status(405).json({error:'Method not allowed'}); return; }
  try{
    const { userId } = req.body;
    if(!userId){ res.status(400).json({error:'userId required'}); return; }
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if(!SUPABASE_URL || !SUPABASE_SERVICE_KEY){
      res.status(500).json({error:'Supabase 환경변수 없음'}); return;
    }
    const headers = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
    // 1. users 테이블 삭제 (service_role로 RLS 우회)
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'DELETE',
      headers
    });
    console.log('DB 삭제 응답:', dbRes.status, await dbRes.text());
    // 2. Supabase Auth 계정 삭제
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers
    });
    const authText = await authRes.text();
    console.log('Auth 삭제 응답:', authRes.status, authText);
    if(!authRes.ok){
      res.status(200).json({success: true, warning: 'Auth 삭제 실패: '+authRes.status});
      return;
    }
    res.status(200).json({success: true});
  }catch(e){
    res.status(500).json({error: e.message});
  }
}
