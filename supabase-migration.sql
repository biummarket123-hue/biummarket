-- Supabase SQL Editor에서 실행하세요
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;
