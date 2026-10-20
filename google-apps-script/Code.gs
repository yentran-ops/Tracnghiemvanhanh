/**
 * TNG Quiz – nhận kết quả và ghi vào Google Sheets.
 * Dán toàn bộ đoạn này vào Tiện ích mở rộng → Apps Script của file Google Sheets (tài khoản yen.tran@thenewgym.vn).
 * Đổi SECRET bên dưới thành một chuỗi bí mật bất kỳ, và đặt đúng chuỗi đó vào biến SHEET_SECRET trên Vercel.
 */
const SECRET = 'DOI-CHUOI-BI-MAT-NAY';
const SHEET_NAME = 'Kết quả';
const HEADERS = ['Ngày làm bài', 'Thời điểm nộp', 'Họ và tên', 'Phòng ban', 'Ngày vào làm',
  'Số câu đúng', 'Tổng số câu', 'Điểm', 'Thời gian (giây)', 'Thời gian (mm:ss)', 'Chi tiết theo chủ đề'];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return out({ ok: false, error: 'unauthorized' });
    const r = body.result;
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sh = ss.getSheetByName(SHEET_NAME);
      if (!sh) {
        sh = ss.insertSheet(SHEET_NAME);
        sh.appendRow(HEADERS);
        sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#111827').setFontColor('#ffffff');
        sh.setFrozenRows(1);
      }
      const mmss = Utilities.formatString('%02d:%02d', Math.floor(r.duration / 60), r.duration % 60);
      const topics = Object.keys(r.topics || {}).map(function (k) { return k + ': ' + r.topics[k][0] + '/' + r.topics[k][1]; }).join(' | ');
      sh.appendRow([
        body.date,
        Utilities.formatDate(new Date(r.at), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'),
        r.name, r.dept, r.joinDate || '', r.correct, r.total, r.score, r.duration, mmss, topics,
      ]);
    } finally {
      lock.releaseLock();
    }
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function doGet() {
  return out({ ok: true, service: 'TNG Quiz sheet webhook' });
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
