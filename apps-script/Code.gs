/**
 * Academy ON 랜딩페이지 신청서 → 구글 시트 저장
 * 1단계 신청은 "학부모"/"학원" 시트, 2단계 선택 설문은 "학부모 설문"/"학원 설문" 시트에 쌓입니다.
 * 두 단계는 id 열로 연결됩니다.
 */
const META = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer'];
const SHEETS = {
  parent:         { name: '학부모',      cols: ['submittedAt', 'id', 'academies', 'region', 'contact', 'consent', ...META] },
  academy:        { name: '학원',        cols: ['submittedAt', 'id', 'region', 'contact', 'consent', ...META] },
  parent_survey:  { name: '학부모 설문', cols: ['submittedAt', 'id', 'grade', 'phone', 'pain', 'price', 'pilot'] },
  academy_survey: { name: '학원 설문',   cols: ['submittedAt', 'id', 'kind', 'students', 'vehicle', 'level', 'note'] },
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
