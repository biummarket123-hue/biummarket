// Supabase products 전체 초기화 + 샘플 10개 삽입
const SB_URL = 'https://ygernyfkydqalqmjzjbw.supabase.co';
const SB_KEY = 'sb_publishable_CIC03pgTltIAwP24vpZXyQ_6QEajQ2_';

const headers = {
  'apikey': SB_KEY,
  'Authorization': `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const SELLERS = [
  {id:'s1', name:'광장섬유',      temp:37.2, loc:'서울 중구 동대문'},
  {id:'s2', name:'에코텍스코리아', temp:36.8, loc:'서울 성동구 성수동'},
  {id:'s3', name:'명성모직',      temp:38.0, loc:'서울 중구 동대문'},
  {id:'s4', name:'대한니트',      temp:37.5, loc:'서울 중구 신당동'},
  {id:'s5', name:'JS스트레치',    temp:36.5, loc:'서울 동대문구 답십리'},
  {id:'s6', name:'금성실크',      temp:37.8, loc:'서울 중구 동대문'},
  {id:'s7', name:'청일직물',      temp:37.1, loc:'서울 종로구 창신동'},
  {id:'s8', name:'한일섬유',      temp:36.9, loc:'서울 중구 동대문'},
  {id:'s9', name:'고려모직',      temp:37.6, loc:'서울 중구 을지로'},
  {id:'s10',name:'스포텍',        temp:38.0, loc:'서울 성동구 성수동'},
];

// urgent 컬럼 없음 → tags에 '급처' 포함으로 대체
const SAMPLES = [
  {title:'코마 면 트윌 60수 오트밀', type:'면', color:'베이지', width:150, weight:185, qty:500, price:2800,
   loc:'서울 중구 동대문', cat:'천연섬유',
   description:'60수 코마 면 트윌 소재입니다. 세밀한 조직감과 부드러운 손감이 특징이며 여름 셔츠, 블라우스, 홈웨어에 적합합니다. 대량 구매 시 협의 가능합니다.',
   tags:['면트윌','60수','오트밀','코마면','급처'], seller:SELLERS[0], imgs:2, likes:8, chats:3, time:'1시간 전'},
  {title:'GOTS 오가닉 린넨 워싱 세이지그린', type:'린넨', color:'그린', width:140, weight:165, qty:300, price:9800,
   loc:'서울 성동구 성수동', cat:'천연섬유',
   description:'GOTS 국제 인증 오가닉 린넨 원단입니다. 워싱 가공으로 부드러운 손감과 자연스러운 빈티지 느낌이 특징이며 친환경 패션 브랜드에 최적입니다.',
   tags:['GOTS','오가닉린넨','세이지그린','친환경','워싱'], seller:SELLERS[1], imgs:3, likes:15, chats:6, time:'2시간 전'},
  {title:'이태리 까발리 울 서지 차콜 280g', type:'울', color:'차콜', width:150, weight:280, qty:200, price:12000,
   loc:'서울 중구 동대문', cat:'천연섬유',
   description:'이탈리아 까발리社 울 서지 원단입니다. 고급 정장·코트 제작에 적합하며 내구성과 드레이프성이 우수합니다.',
   tags:['울서지','이태리산','차콜','정장감','까발리'], seller:SELLERS[2], imgs:4, likes:22, chats:9, time:'3시간 전'},
  {title:'C/R 기모 스웨트 쉬링크 로즈핑크', type:'니트', color:'핑크', width:160, weight:320, qty:1000, price:1400,
   loc:'서울 중구 신당동', cat:'합성섬유',
   description:'면/레이온 혼방 기모 스웨트 원단입니다. 쉬링크 처리로 표면이 부드럽고 보온성이 뛰어납니다. 트레이닝복, 후드, 맨투맨에 적합합니다.',
   tags:['기모스웨트','C/R','로즈핑크','트레이닝','급처'], seller:SELLERS[3], imgs:2, likes:11, chats:5, time:'4시간 전'},
  {title:'4WAY 나일론 스판 저지 더스티모브', type:'기능성', color:'보라', width:160, weight:210, qty:500, price:3500,
   loc:'서울 동대문구 답십리', cat:'합성섬유',
   description:'4방향 신축성 나일론 스판덱스 저지 원단입니다. 애슬레저, 수영복, 요가복 등 활동적인 의류 제작에 최적의 소재입니다.',
   tags:['나일론스판','4WAY','더스티모브','애슬레저','요가복'], seller:SELLERS[4], imgs:3, likes:18, chats:7, time:'5시간 전'},
  {title:'하부타이 실크 새틴 16mm 샴페인골드', type:'실크', color:'골드', width:140, weight:95, qty:50, price:20000,
   loc:'서울 중구 동대문', cat:'천연섬유',
   description:'16mm 하부타이 실크 새틴 원단입니다. 은은한 광택과 뛰어난 드레이프성으로 웨딩드레스, 이브닝웨어, 스카프 제작에 적합합니다.',
   tags:['하부타이실크','새틴','샴페인골드','16mm','웨딩'], seller:SELLERS[5], imgs:5, likes:31, chats:14, time:'어제'},
  {title:'셀비지 데님 14oz 인디고 원워시', type:'데님', color:'인디고', width:150, weight:420, qty:100, price:7500,
   loc:'서울 종로구 창신동', cat:'천연섬유',
   description:'14온스 셀비지 데님 원단입니다. 인디고 원워시 처리로 깔끔한 빈티지 느낌이 나며 청바지, 재킷, 데님 가방 제작에 적합합니다.',
   tags:['셀비지데님','14oz','인디고','원워시','청바지감'], seller:SELLERS[6], imgs:3, likes:26, chats:11, time:'1일 전'},
  {title:'폴리 조젯 쉬폰 아이보리 75D', type:'폴리', color:'아이보리', width:150, weight:55, qty:800, price:1200,
   loc:'서울 중구 동대문', cat:'합성섬유',
   description:'75D 폴리 조젯 쉬폰 원단입니다. 가볍고 통기성이 좋아 여름 블라우스, 원피스, 스카프에 적합합니다. 대량 재고 보유 중입니다.',
   tags:['조젯쉬폰','폴리','아이보리','75D','대량재고'], seller:SELLERS[7], imgs:2, likes:9, chats:4, time:'1일 전'},
  {title:'울 캐시미어 혼방 헤링본 네이비', type:'울', color:'네이비', width:150, weight:310, qty:150, price:18000,
   loc:'서울 중구 을지로', cat:'천연섬유',
   description:'울 80% + 캐시미어 20% 혼방 헤링본 원단입니다. 클래식한 패턴과 부드러운 캐시미어 텍스처가 특징인 프리미엄 소재입니다.',
   tags:['울캐시미어','헤링본','네이비','프리미엄','혼방'], seller:SELLERS[8], imgs:4, likes:35, chats:16, time:'2일 전'},
  {title:'테크니컬 소프트쉘 올리브 방수', type:'기능성', color:'올리브', width:150, weight:285, qty:400, price:8500,
   loc:'서울 성동구 성수동', cat:'기능성',
   description:'방수·방풍 기능의 소프트쉘 원단입니다. 3레이어 구조로 내구성과 기능성을 모두 갖춘 아웃도어 의류 제작에 최적화된 소재입니다.',
   tags:['소프트쉘','방수','올리브','아웃도어','테크니컬'], seller:SELLERS[9], imgs:3, likes:19, chats:8, time:'2일 전'},
];

async function run() {
  // 1. 현재 상태 확인
  console.log('\n── 현재 products 테이블 조회 ──');
  const listRes = await fetch(`${SB_URL}/rest/v1/products?select=id,title&order=created_at.asc`, { headers });
  const listData = await listRes.json();
  console.log(`현재 rows: ${listData.length}`);
  listData.forEach(r => console.log(`  [${r.id}] ${r.title}`));

  // 2. 전체 삭제 (id > 0 조건으로 모두 삭제)
  console.log('\n── 기존 데이터 전체 삭제 ──');
  const delRes = await fetch(
    `${SB_URL}/rest/v1/products?id=gte.0`,
    { method: 'DELETE', headers: { ...headers, 'Prefer': 'return=minimal' } }
  );
  if (delRes.status === 204 || delRes.ok) {
    console.log('✓ 전체 삭제 완료');
  } else {
    const body = await delRes.text();
    console.error('삭제 실패:', delRes.status, body);
    process.exit(1);
  }

  // 삭제 후 확인
  const checkRes = await fetch(`${SB_URL}/rest/v1/products?select=id`, { headers });
  const checkData = await checkRes.json();
  console.log(`삭제 후 남은 rows: ${checkData.length}`);

  // 3. 샘플 10개 INSERT
  console.log('\n── 샘플 10개 INSERT ──');
  const insertRes = await fetch(`${SB_URL}/rest/v1/products`, {
    method: 'POST',
    headers,
    body: JSON.stringify(SAMPLES),
  });
  if (insertRes.status === 201 || insertRes.ok) {
    const inserted = await insertRes.json();
    const count = Array.isArray(inserted) ? inserted.length : '?';
    console.log(`✓ INSERT 성공: ${count}개`);
    if (Array.isArray(inserted)) {
      inserted.forEach(r => console.log(`  [${r.id}] ${r.title} / ${r.type} / ${r.price}원`));
    }
  } else {
    const body = await insertRes.text();
    console.error('INSERT 실패:', insertRes.status, body);
    process.exit(1);
  }

  // 4. 최종 확인
  const finalRes = await fetch(
    `${SB_URL}/rest/v1/products?select=id,title,type,price&order=created_at.asc`,
    { headers }
  );
  const finalData = await finalRes.json();
  console.log(`\n── 최종 products 테이블 (${finalData.length}개) ──`);
  finalData.forEach(r => console.log(`  [${r.id}] ${r.title} / ${r.type} / ${r.price}원`));
}

run().catch(e => { console.error(e); process.exit(1); });
