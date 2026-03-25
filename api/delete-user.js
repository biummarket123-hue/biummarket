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
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    const responseText = await response.text();
    console.log('Supabase Auth 삭제 응답:', response.status, responseText);
    if(!response.ok){
      res.status(500).json({error: responseText, status: response.status}); return;
    }
    res.status(200).json({success: true});
  }catch(e){
    res.status(500).json({error: e.message});
  }
}
