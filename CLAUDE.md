# 비움마켓 작업 규칙

## Git 워크플로우 (자동 vs 수동)

### 작업 시작 시 (자동)
1. git status로 현재 상태 확인
2. git pull --rebase로 GitHub 최신 동기화 (DB 자동 백업 받기)
3. 깨끗한 상태 확인 후 새 작업 시작

### 작업 중 자동 실행 (Claude가 알아서)
의미있는 작업 단위 완성 시 사용자 확인 후 자동으로 다음 순서 실행:
1. git add 변경된 파일
2. git commit -m "[의미있는 한국어 메시지]"
3. git push

### 푸시 거부 시 자동 처리
- "non-fast-forward" 에러 발생 시:
  1. git pull --rebase
  2. git push 재시도
- DB 자동 백업 등 GitHub 신규 커밋 자동 통합

### 절대 자동 실행 금지
- npx vercel --prod (배포)
- git push --force
- git reset --hard
- 데이터베이스 변경 SQL (UPDATE, DELETE 등)
- 파일 대량 삭제

## 커밋 메시지 형식
접두사 사용:
- feat: 새 기능 추가
- fix: 버그 수정
- style: 디자인/색상/UI 변경
- chore: 설정, 문서, 빌드 등
- refactor: 리팩토링

메시지 작성 규칙:
- 한국어로 작성
- 의미있게 구체적으로
- 단순 "수정" "변경" 같은 모호한 메시지 금지
- 시간 포함된 자동 메시지 금지

좋은 예:
- "feat: 가격제안 채팅 통합"
- "fix: 모달 닫힘 버그 수정"
- "style: 홈 카드 가격 색상 변경"

나쁜 예:
- "수정"
- "auto commit 14:23"
- "변경 사항"

## 작업 원칙
1. 큰 변경 전 git status로 현재 상태 확인
2. 의미있는 단위로 자동 commit
3. 사용자 확인 후 자동 push
4. 배포는 사용자가 명시적으로 "배포해줘" 요청 시에만
5. 사용자가 "이 작업 끝났어" "완료" "잘 됐어" 같은 확인 시 자동 push 진행

## 환경 정보
- 로컬 경로: C:\Users\A\biummarket
- 로컬 서버: http://localhost:3000/?from=landing
- 단일 파일 구조: index.html (CSS/JS 분리 금지)
- GitHub: https://github.com/biummarket123-hue/biummarket
- 배포: Vercel 수동 (npx vercel --prod)
- Supabase URL: https://ygernyfkydqalqmjzjbw.supabase.co
- Supabase 변수명: _sb

## 자동 백업 시스템
- 매일 1회 "DB 자동 백업 [날짜]" 커밋이 GitHub에 자동 푸시됨
- 작업 시작 시 git pull --rebase로 자동 통합
- 충돌 시 rebase 우선

## 주의사항
- 단일 파일 구조이므로 CSS/JS 분리 금지
- API 호출 CORS 문제 시 /api/ 서버리스 함수로 해결
- 로컬스토리지: lsSet()/lsGet() 사용
- Supabase: _sb 변수 사용
