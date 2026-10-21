/**
 * Academy ON 랜딩페이지 응답 → 구글 시트 저장
 * 구매의향: 버튼 한 번 누를 때마다 기록 (연락처 없음)
 * 상세응답: 의향별 추가 질문 / 연락처: 출시 알림 신청 / 학원: 원장님 참여 의향
 * 모든 시트는 id 열로 같은 방문자를 연결합니다.
 */
const META = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer'];
const SHEETS = {
  intent:  { name: '구매의향', cols: ['submittedAt', 'id', 'intent', ...META] },
  detail:  { name: '상세응답', cols: ['submittedAt', 'id', 'intent', 'wish_price', 'reason', 'academies', 'grade', 'phone'] },
  contact: { name: '연락처',   cols: ['submittedAt', 'id', 'intent', 'region', 'contact', 'pilot', 'consent', ...META] },
  academy: { name: '학원',     cols: ['submittedAt', 'id', 'region', 'contact', 'pilot', 'consent', ...META] },
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
