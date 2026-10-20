import crypto from 'node:crypto';

export const DEPTS = ['Vận hành', 'Kế toán', 'Membership', 'Ban phát triển'];
export const QUIZ_SIZE = Number(process.env.QUIZ_SIZE || 20);
export const TIME_LIMIT = Number(process.env.TIME_LIMIT_SEC || 2400); // 40 phút
export const MAX_PIN_FAILS = 5;

// Ngày theo giờ Việt Nam (UTC+7) — bảng xếp hạng làm mới lúc 00:00
export function today() {
  return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
}
export function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function clean(s) {
  return String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
}
export function userKey(name, dept) {
  return `${dept}|${clean(name).toLowerCase()}`;
}
export function hashPin(pin, salt) {
  return crypto.scryptSync(String(pin), salt, 32).toString('hex');
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// items: ảnh chụp câu hỏi tại thời điểm phát đề { id, topic, ref, q, o, perm }
export function publicQuestions(items) {
  return items.map((it) => ({ topic: it.topic, q: it.q, options: it.perm.map((i) => it.o[i]) }));
}

// Thống kê theo câu hỏi: "{id}:n" số lần gặp, "{id}:w" số lần sai, "{id}:c{k}" số lần chọn phương án gốc k
export function qStatIncr(review, sign) {
  const o = {};
  (review || []).forEach((r) => {
    if (!r.qid) return;
    o[`${r.qid}:n`] = (o[`${r.qid}:n`] || 0) + sign;
    if (!r.ok) o[`${r.qid}:w`] = (o[`${r.qid}:w`] || 0) + sign;
    if (!r.ok && r.pick != null) o[`${r.qid}:c${r.pick}`] = (o[`${r.qid}:c${r.pick}`] || 0) + sign;
  });
  return o;
}

export function rankRows(rows) {
  return rows.sort((a, b) => b.correct - a.correct || b.score - a.score || a.duration - b.duration || a.at - b.at);
}
