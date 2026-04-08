export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    res.status(500).json({ error: 'Missing env vars' }); return;
  }

  const sql = `
    CREATE TABLE IF NOT EXISTS wishes (
      id bigint generated always as identity primary key,
      user_id text not null,
      product_id bigint not null,
      created_at timestamptz default now(),
      unique(user_id, product_id)
    );
    ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "wishes_select" ON wishes FOR SELECT USING (true);
    CREATE POLICY "wishes_insert" ON wishes FOR INSERT WITH CHECK (true);
    CREATE POLICY "wishes_delete" ON wishes FOR DELETE USING (true);
    CREATE INDEX IF NOT EXISTS idx_wishes_user ON wishes(user_id);
    CREATE INDEX IF NOT EXISTS idx_wishes_product ON wishes(product_id);
  `;

  // 방법 1: Supabase SQL endpoint (/pg/query)
  const endpoints = [
    '/rest/v1/rpc/exec_sql',
  ];

  // 방법 2: pg 직접 연결 시도 (DATABASE_URL 있는 경우)
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (dbUrl) {
    try {
      // dynamic import for pg if available
      const { default: pg } = await import('pg');
      const client = new pg.Client({ connectionString: dbUrl });
      await client.connect();
      await client.query(sql);
      await client.end();
      res.status(200).json({ success: true, method: 'pg_direct' });
      return;
    } catch (e) {
      // pg 안 되면 다음 방법 시도
    }
  }

  // 방법 3: service_role key로 REST API 시도
  try {
    const headers = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    };

    // 테이블이 이미 있는지 확인
    const check = await fetch(`${SUPABASE_URL}/rest/v1/wishes?select=id&limit=1`, { headers });
    if (check.ok) {
      res.status(200).json({ success: true, message: 'Table already exists' });
      return;
    }

    // rpc exec_sql 시도
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST', headers,
      body: JSON.stringify({ sql }),
    });
    if (rpcRes.ok) {
      res.status(200).json({ success: true, method: 'rpc_exec_sql' });
      return;
    }

    // 모두 실패 시 안내
    res.status(200).json({
      success: false,
      message: 'Auto-creation failed. Please run SQL manually in Supabase Dashboard > SQL Editor',
      sql: sql.trim(),
      env_check: {
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_SERVICE_KEY: !!SUPABASE_SERVICE_KEY,
        DATABASE_URL: !!dbUrl,
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
