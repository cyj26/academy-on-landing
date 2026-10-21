# 신청서 수신 설정 (구글 시트)

1. 구글 시트를 새로 만든다 (예: "Academy ON 베타 신청").
2. 메뉴 **확장 프로그램 → Apps Script**를 연다.
3. 기본 코드를 지우고 `Code.gs` 내용을 붙여 넣은 뒤 저장한다.
4. **배포 → 새 배포 → 유형: 웹 앱**
   - 실행 사용자: 나
   - 액세스 권한: 모든 사용자
5. 발급된 웹 앱 URL(`https://script.google.com/macros/s/.../exec`)을 `index.html`의 `FORM_ENDPOINT`에 넣고 push한다.

응답은 시트의 "학부모", "학원" 탭에 자동으로 쌓인다.
