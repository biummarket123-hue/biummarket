-- 기존 상품의 allow_offer를 모두 false로 일괄 업데이트
-- 사유: 가격제안 토글 기능이 추가되기 이전에 등록된 상품은 allow_offer 컬럼이 DEFAULT true로
--       자동 채워졌지만, 셀러가 명시적으로 켠 적은 없으므로 비활성 상태로 정정한다.
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 실행일: 2026-05-06

UPDATE products
SET allow_offer = false
WHERE allow_offer IS NOT FALSE;

-- 확인용 — 실행 후 0이 떠야 정상
-- SELECT COUNT(*) FROM products WHERE allow_offer IS NOT FALSE;
