/**
 * Academy ON 설문 → 구글 시트 '응답' 탭 하나에 저장
 * - 한 사람(응답자 ID)당 한 줄. 다시 응답하면 그 줄을 최신 답으로 바꿉니다.
 * - 연락처를 남기면 같은 줄의 연락처 칸을 채웁니다.
 * - setupOnce(): 처음 한 번만 실행. 예전 탭의 실제 응답을 '응답' 탭으로 옮기고,
 *   시험 응답과 예전 탭을 지웁니다. (되돌리려면 파일 → 버전 기록)
 */
const SHEET_NAME = '응답';
const COLS = ['submittedAt', 'id', 'intent', 'wish_price', 'reason', 'academies_week', 'children', 'grade', 'phone',
  'location_app', 'existing_app', 'plan', 'region', 'contact', 'pilot', 'consent', 'utm_source', 'referrer'];
const HEADERS = ['응답 시각', '응답자 ID', '구독 의향', '희망 가격', '필요 없는 이유', '학원 수(주)', '자녀 수', '학년', '휴대폰',
  '위치 앱', '쓰던 앱 요금', '해당 요금제', '지역', '연락처', '시범 참여', '개인정보 동의', '유입 경로', '접속 주소'];
const CONTACT_COLS = ['region', 'contact', 'pilot', 'consent'];

const LABELS = {
  intent: { buy: '철통 지킴이도 쓸래요', cheaper: '더 저렴하면 쓸래요', free: '무료만 쓸래요', no: '필요 없어요' },
  reason: { current: '지금 알림으로 충분', one: '학원이 1곳뿐', pickup: '직접 데려다줌', location: '위치 앱 사용', trust: '작동 의문' },
  grade: { 'e1-3': '초1~3', 'e4-6': '초4~6', middle: '중학생', high: '고등학생', '1-2': '초1~2', '3-4': '초3~4', '5-6': '초5~6', other: '그 외' },
  phone: { smart: '스마트폰', kids: '키즈폰', none: '없음' },
  location_app: { using: '쓰고 있음', used: '써 봤음', never: '안 씀' },
  plan: { free: '안전 지킴이(무료)', premium: '철통 지킴이(유료)' },
};

function label_(col, value) {
  let v = value === undefined || value === null ? '' : value;
  if (v instanceof Date) v = v.toISOString();
  v = String(v).slice(0, 300);
  if (v === '') return '';
  if (col === 'submittedAt') {
    const d = new Date(v);
    return isNaN(d) ? v : Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
  }
  if (col === 'academies_week') return v === '0' ? '없음' : /곳|없음/.test(v) ? v : v + '곳';
  if (col === 'children') return /명/.test(v) ? v : v + '명';
  if (col === 'wish_price') return /원/.test(v) ? v : Number(v).toLocaleString('ko-KR') + '원';
  if (col === 'reason') return v.split(',').map(s => LABELS.reason[s.trim()] || s.trim()).join(', ');
  if (col === 'pilot' || col === 'consent') return v === 'true' || v === 'TRUE' || v === '예' ? '예' : '아니요';
  if (col === 'contact') {
    if (/^1\d{9}$/.test(v)) v = '0' + v; // 앞자리 0이 빠진 휴대폰 번호 복구
    return "'" + v.replace(/^'/, '');      // 숫자로 바뀌지 않게 글자로 저장
  }
  return (LABELS[col] && LABELS[col][v]) || v;
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME, 0);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#dcf7ea');
  }
  return sh;
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const ids = sh.getRange(2, 2, last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function writeResponse_(sh, d) {
  const values = COLS.map(c => label_(c, d[c]));
  const row = findRow_(sh, d.id);
  if (row) {
    const old = sh.getRange(row, 1, 1, COLS.length).getValues()[0];
    CONTACT_COLS.forEach(c => { const i = COLS.indexOf(c); if (!values[i]) values[i] = c === 'contact' && old[i] ? "'" + old[i] : old[i]; });
    sh.getRange(row, 1, 1, COLS.length).setValues([values]);
  } else {
    sh.appendRow(values);
  }
}

function writeContact_(sh, d) {
  let row = findRow_(sh, d.id);
  if (!row) {
    sh.appendRow(COLS.map(c => (c === 'submittedAt' || c === 'id' ? label_(c, d[c]) : '')));
    row = sh.getLastRow();
  }
  CONTACT_COLS.forEach(c => sh.getRange(row, COLS.indexOf(c) + 1).setValue(label_(c, d[c])));
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.website || !d.id) return ContentService.createTextOutput('ignored');
    const sh = sheet_();
    if (d.type === 'response' || d.type === 'detail') writeResponse_(sh, d);
    else if (d.type === 'contact') writeContact_(sh, d);
    else return ContentService.createTextOutput('ignored');
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

/** 처음 한 번만 실행: 예전 탭 → '응답' 탭으로 정리 */
function setupOnce() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(SHEET_NAME)) throw new Error("'응답' 탭이 이미 있습니다. 정리는 이미 끝났어요.");
  const iso = v => (v instanceof Date ? v.toISOString() : String(v));
  const read = name => {
    const s = ss.getSheetByName(name);
    if (!s || s.getLastRow() < 2) return [];
    const v = s.getDataRange().getValues();
    return v.slice(1).map(r => Object.fromEntries(v[0].map((k, i) => [k, k === 'submittedAt' ? iso(r[i]) : r[i]])));
  };
  // Claude가 화면 점검 중 보낸 시험 응답
  const isTest = r => String(r.existing_app || '').includes('아이지킴') || r.id === 'TEST-claude' ||
    (r.submittedAt >= '2026-10-22T08:04' && r.submittedAt < '2026-10-22T08:13');
  const latestById = rows => rows.filter(r => !isTest(r)).reduce((m, r) => {
    if (!m[r.id] || r.submittedAt > m[r.id].submittedAt) m[r.id] = r; return m;
  }, {});

  const details = latestById(read('상세응답'));
  const contacts = latestById(read('연락처'));
  const visits = latestById(read('구매의향'));

  const sh = sheet_();
  Object.values(details).sort((a, b) => (a.submittedAt < b.submittedAt ? -1 : 1)).forEach(r => {
    const v = visits[r.id] || {};
    writeResponse_(sh, { ...r, utm_source: v.utm_source || '', referrer: v.referrer || '' });
  });
  Object.values(contacts).forEach(c => writeContact_(sh, c));

  ['우리집요금', '구매의향', '상세응답', '연락처', '학원', '시트1', 'Sheet1'].forEach(n => {
    const s = ss.getSheetByName(n);
    if (s) ss.deleteSheet(s);
  });
  sh.autoResizeColumns(1, COLS.length);
}
