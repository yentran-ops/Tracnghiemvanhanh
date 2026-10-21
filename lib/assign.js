// Đề chỉ định: quản trị viên chọn 1 bộ câu hỏi cho từng nhóm nhân viên trong một khoảng ngày.
// Trong thời gian áp dụng, nhân viên được chọn nhận đúng bộ câu này (thứ tự câu và đáp án vẫn đảo); điểm tính như bình thường.
import { getJSON, setJSON } from './store.js';
import { clean } from './util.js';

const KEY = 'assign';
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

export async function listAssign() {
  return (await getJSON(KEY)) || [];
}

// Đề đang áp dụng cho nhân viên uk vào ngày date (đề lưu sau cùng được ưu tiên)
export async function activeAssign(uk, date) {
  return (await listAssign()).filter((a) => a.active && a.uks.includes(uk) && a.from <= date && date <= a.to).sort((x, y) => y.at - x.at)[0] || null;
}

// b = { id?, name, uks[], qids[], from, to, active } → chuỗi lỗi hoặc danh sách mới
export async function saveAssign(b, bankIds) {
  const name = clean(b.name).slice(0, 80);
  const uks = [...new Set((Array.isArray(b.uks) ? b.uks : []).map(String))].slice(0, 1000);
  const qids = [...new Set((Array.isArray(b.qids) ? b.qids : []).map(String))].filter((id) => bankIds.has(id)).slice(0, 100);
  if (!name) return 'Vui lòng đặt tên cho bộ đề.';
  if (!uks.length) return 'Chọn ít nhất 1 nhân viên.';
  if (qids.length < 1) return 'Chọn ít nhất 1 câu hỏi.';
  if (!isDate(b.from) || !isDate(b.to) || b.from > b.to) return 'Khoảng thời gian áp dụng không hợp lệ.';
  const list = await listAssign();
  const id = b.id && list.some((a) => a.id === b.id) ? b.id : 'a' + Date.now().toString(36);
  const item = { id, name, uks, qids, from: b.from, to: b.to, active: b.active !== false, at: Date.now() };
  const next = [...list.filter((a) => a.id !== id), item];
  await setJSON(KEY, next);
  return next;
}

export async function setAssignActive(id, active) {
  const list = await listAssign();
  const a = list.find((x) => x.id === id);
  if (!a) return false;
  a.active = Boolean(active);
  await setJSON(KEY, list);
  return true;
}

export async function deleteAssign(id) {
  const list = await listAssign();
  if (!list.some((a) => a.id === id)) return false;
  await setJSON(KEY, list.filter((a) => a.id !== id));
  return true;
}
