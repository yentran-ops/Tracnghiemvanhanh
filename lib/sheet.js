// Gửi kết quả sang Google Sheets qua Apps Script Web App (xem google-apps-script/Code.gs).
// Cần biến môi trường SHEET_WEBHOOK_URL và SHEET_SECRET. Không cấu hình thì bỏ qua.
const URL_ = process.env.SHEET_WEBHOOK_URL;
const SECRET = process.env.SHEET_SECRET || '';

export async function appendToSheet(result, date) {
  if (!URL_) return;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: SECRET, date, result }),
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!r.ok) console.error('Sheet webhook HTTP', r.status);
  } catch (e) {
    console.error('Sheet webhook error', e.message);
  } finally {
    clearTimeout(timer);
  }
}
