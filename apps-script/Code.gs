/**
 * Academy ON 랜딩페이지 응답 → 구글 시트 저장
 * 우리집요금: 계산기 아래 질문 응답 (연락처 없음)
 * 구매의향: 버튼 한 번 누를 때마다 기록 (연락처 없음)
 * 상세응답: 의향별 추가 질문 / 연락처: 출시 알림 신청 / 학원: 원장님 참여 의향
 * 모든 시트는 id 열로 같은 방문자를 연결합니다.
 */
const META = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer'];
// 계산기 아래 '우리 집 요금' 질문과 계산기 값
const PROFILE = ['academies_week', 'children', 'grade', 'phone', 'location_app', 'existing_app', 'plan', 'academies_day', 'move_min', 'days'];
const SHEETS = {
  calc:    { name: '우리집요금', cols: ['submittedAt', 'id', ...PROFILE, ...META] },
  intent:  { name: '구매의향',   cols: ['submittedAt', 'id', 'intent', ...PROFILE, ...META] },
  detail:  { name: '상세응답',   cols: ['submittedAt', 'id', 'intent', 'wish_price', 'reason', ...PROFILE] },
  contact: { name: '연락처',     cols: ['submittedAt', 'id', 'intent', 'region', 'contact', 'pilot', 'consent', ...META] },
  academy: { name: '학원',       cols: ['submittedAt', 'id', 'region', 'contact', 'pilot', 'consent', ...META] },
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const conf = SHEETS[data.type];
    if (!conf || data.website) return ContentService.createTextOutput('ignored');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(conf.name);
    if (!sheet) {
      sheet = ss.insertSheet(conf.name);
      sheet.appendRow(conf.cols);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(conf.cols.map(c => String(data[c] ?? '').slice(0, 1000)));
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}
