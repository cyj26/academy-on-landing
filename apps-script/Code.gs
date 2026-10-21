/**
 * Academy ON 랜딩페이지 신청서 → 구글 시트 저장
 * 학부모 응답은 "학부모" 시트, 학원 응답은 "학원" 시트에 쌓입니다.
 */
const SHEETS = {
  parent: { name: '학부모', cols: ['submittedAt', 'grade', 'academies', 'phone', 'pain', 'price', 'region', 'contact', 'pilot', 'consent', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer'] },
  academy: { name: '학원', cols: ['submittedAt', 'kind', 'students', 'vehicle', 'level', 'region', 'contact', 'note', 'consent', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer'] },
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
